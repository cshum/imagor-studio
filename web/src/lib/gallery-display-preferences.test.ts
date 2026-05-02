import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  invalidateGalleryDisplayPreferencesCache,
  loadGalleryDisplayPreferences,
} from './gallery-display-preferences'

const mockGetResolvedGalleryDisplayPreferences = vi.fn()

vi.mock('@/generated/graphql-request', () => ({
  getSdk: () => ({
    GetResolvedGalleryDisplayPreferences: mockGetResolvedGalleryDisplayPreferences,
  }),
}))

vi.mock('@/lib/graphql-client', () => ({
  getGraphQLClient: vi.fn(() => ({})),
}))

describe('loadGalleryDisplayPreferences', () => {
  beforeEach(() => {
    invalidateGalleryDisplayPreferencesCache()
    mockGetResolvedGalleryDisplayPreferences.mockReset()
    mockGetResolvedGalleryDisplayPreferences.mockResolvedValue({
      userRegistryEntries: [],
      spaceRegistryEntries: [],
      systemRegistryEntries: [],
    })
  })

  it('caches repeated loads for the same user and space scope', async () => {
    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' })
    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' })

    expect(mockGetResolvedGalleryDisplayPreferences).toHaveBeenCalledTimes(1)
  })

  it('does not reuse cache entries across different scopes', async () => {
    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' })
    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-2' })

    expect(mockGetResolvedGalleryDisplayPreferences).toHaveBeenCalledTimes(2)
  })

  it('refetches after cache invalidation', async () => {
    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' })

    invalidateGalleryDisplayPreferencesCache()

    await loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' })

    expect(mockGetResolvedGalleryDisplayPreferences).toHaveBeenCalledTimes(2)
  })

  it('clears rejected requests so a retry can refetch', async () => {
    mockGetResolvedGalleryDisplayPreferences
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({
        userRegistryEntries: [],
        spaceRegistryEntries: [],
        systemRegistryEntries: [],
      })

    await expect(
      loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' }),
    ).rejects.toThrow('network')

    await expect(
      loadGalleryDisplayPreferences({ userID: 'user-1', spaceID: 'space-1' }),
    ).resolves.toEqual({
      sortBy: 'MODIFIED_TIME',
      sortOrder: 'DESC',
      showFileNames: false,
    })

    expect(mockGetResolvedGalleryDisplayPreferences).toHaveBeenCalledTimes(2)
  })
})
