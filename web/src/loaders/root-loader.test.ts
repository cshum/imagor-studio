import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInitializeLocale = vi.fn()
const mockGetAuth = vi.fn()
const mockGetBootstrapRegistryPreferences = vi.fn()
const mockThemeWaitFor = vi.fn()
const mockAuthWaitFor = vi.fn()
const mockLicenseWaitFor = vi.fn()
const mockFolderTreeWaitFor = vi.fn()

vi.mock('@/api/registry-api', () => ({
  getBootstrapRegistryPreferences: (...args: unknown[]) =>
    mockGetBootstrapRegistryPreferences(...args),
}))

vi.mock('@/stores/locale-store.ts', () => ({
  initializeLocale: (...args: unknown[]) => mockInitializeLocale(...args),
}))

vi.mock('@/stores/auth-store.ts', () => ({
  getAuth: () => mockGetAuth(),
  authStore: {
    waitFor: (...args: unknown[]) => mockAuthWaitFor(...args),
  },
}))

vi.mock('@/stores/theme-store.ts', () => ({
  themeStore: {
    waitFor: (...args: unknown[]) => mockThemeWaitFor(...args),
  },
}))

vi.mock('@/stores/license-store.ts', () => ({
  licenseStore: {
    waitFor: (...args: unknown[]) => mockLicenseWaitFor(...args),
  },
}))

vi.mock('@/stores/folder-tree-store.ts', () => ({
  folderTreeStore: {
    waitFor: (...args: unknown[]) => mockFolderTreeWaitFor(...args),
  },
}))

describe('rootLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockThemeWaitFor.mockResolvedValue(undefined)
    mockAuthWaitFor.mockResolvedValue(undefined)
    mockGetBootstrapRegistryPreferences.mockResolvedValue({
      userRegistryEntries: [],
      systemRegistryEntries: [],
    })
  })

  it('skips locale and license bootstrap on unauthenticated multi-tenant pages', async () => {
    const { rootLoader } = await import('./root-loader')

    mockGetAuth.mockReturnValue({
      accessToken: null,
      multiTenant: true,
    })

    await expect(rootLoader()).resolves.toEqual({})

    expect(mockInitializeLocale).not.toHaveBeenCalled()
    expect(mockGetBootstrapRegistryPreferences).not.toHaveBeenCalled()
    expect(mockLicenseWaitFor).not.toHaveBeenCalled()
    expect(mockFolderTreeWaitFor).not.toHaveBeenCalled()
  })

  it('uses only the system locale fallback on unauthenticated self-hosted pages', async () => {
    const { rootLoader } = await import('./root-loader')

    mockGetAuth.mockReturnValue({
      accessToken: null,
      multiTenant: false,
    })
    mockGetBootstrapRegistryPreferences.mockResolvedValue({
      userRegistryEntries: [],
      systemRegistryEntries: [{ key: 'config.app_default_language', value: 'fr' }],
    })

    await expect(rootLoader()).resolves.toEqual({})

    expect(mockGetBootstrapRegistryPreferences).toHaveBeenCalledWith(
      [],
      ['config.app_default_language'],
      {
        includeUser: false,
        includeSystem: true,
      },
    )
    expect(mockInitializeLocale).toHaveBeenCalledWith('fr')
    expect(mockLicenseWaitFor).not.toHaveBeenCalled()
  })

  it('skips license bootstrap for authenticated multi-tenant pages', async () => {
    const { rootLoader } = await import('./root-loader')

    mockGetAuth.mockReturnValue({
      accessToken: 'token',
      multiTenant: true,
    })
    mockGetBootstrapRegistryPreferences.mockResolvedValue({
      userRegistryEntries: [{ key: 'config.app_default_language', value: 'zh' }],
      systemRegistryEntries: [],
    })

    await expect(rootLoader()).resolves.toEqual({})

    expect(mockGetBootstrapRegistryPreferences).toHaveBeenCalledWith(
      ['config.app_default_language'],
      [],
      {
        includeUser: true,
        includeSystem: false,
      },
    )
    expect(mockInitializeLocale).toHaveBeenCalledWith('zh')
    expect(mockLicenseWaitFor).not.toHaveBeenCalled()
  })
})
