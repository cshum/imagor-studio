import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGalleryLoader = vi.fn()
const mockGetAuth = vi.fn()

vi.mock('@/loaders/gallery-loader', () => ({
  galleryLoader: mockGalleryLoader,
}))

vi.mock('@/stores/auth-store', () => ({
  getAuth: mockGetAuth,
}))

describe('root-page-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call galleryLoader in multi-tenant mode', async () => {
    mockGetAuth.mockReturnValue({ multiTenant: true })

    const { rootPageLoader } = await import('./root-page-loader')

    expect(rootPageLoader()).toBeNull()
    expect(mockGalleryLoader).not.toHaveBeenCalled()
  })

  it('calls galleryLoader for the self-hosted root page', async () => {
    const galleryData = { galleryName: 'Home' }
    mockGetAuth.mockReturnValue({ multiTenant: false })
    mockGalleryLoader.mockReturnValue(galleryData)

    const { rootPageLoader } = await import('./root-page-loader')

    expect(rootPageLoader()).toBe(galleryData)
    expect(mockGalleryLoader).toHaveBeenCalledWith({ params: { galleryKey: '' } })
  })
})
