import { getBootstrapRegistryPreferences } from '@/api/registry-api'
import type { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { authStore, getAuth } from '@/stores/auth-store.ts'
import { folderTreeStore } from '@/stores/folder-tree-store.ts'
import { licenseStore } from '@/stores/license-store.ts'
import { initializeLocale } from '@/stores/locale-store.ts'
import { themeStore } from '@/stores/theme-store.ts'

export interface RootLoaderData {
  breadcrumb?: BreadcrumbItem
}

const DEFAULT_LANGUAGE_REGISTRY_KEY = 'config.app_default_language'
const immediatePublicBootPaths = new Set([
  '/login',
  '/join',
  '/privacy',
  '/terms',
  '/register',
  '/register/verify',
  '/account/email/verify',
])

let bootstrappedRootLoaderData: RootLoaderData | null = null

const isImmediatePublicBootPath = (pathname = window.location.pathname) => {
  return immediatePublicBootPaths.has(pathname)
}

export const rootBeforeLoad = async () => {
  if (isImmediatePublicBootPath()) {
    return
  }

  await themeStore.waitFor((state) => state.isLoaded)
  await authStore.waitFor((state) => state.state !== 'loading')
}

const loadRootLoaderData = async (): Promise<RootLoaderData> => {
  await rootBeforeLoad()

  if (isImmediatePublicBootPath()) {
    return {}
  }

  const auth = getAuth()

  if (!auth.accessToken && auth.multiTenant) {
    return {}
  }

  let locale: string | null = null

  try {
    const { userRegistryEntries, systemRegistryEntries } = await getBootstrapRegistryPreferences(
      auth.accessToken ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
      !auth.accessToken || !auth.multiTenant ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
      {
        includeUser: Boolean(auth.accessToken),
        includeSystem: !auth.accessToken || !auth.multiTenant,
      },
    )

    locale = userRegistryEntries[0]?.value || systemRegistryEntries[0]?.value || null
  } catch {
    // Root bootstrap falls back to the current i18n default.
  }

  await initializeLocale(locale)

  if (!auth.accessToken || auth.multiTenant) {
    return {}
  }

  await licenseStore.waitFor((state) => state.isBrandLoaded)

  const folderTreeState = await folderTreeStore.waitFor((state) => state.isHomeTitleLoaded)
  return {
    breadcrumb: {
      label: folderTreeState.homeTitle,
      href: '/',
    },
  }
}

export const bootstrapRootLoaderData = async () => {
  if (isImmediatePublicBootPath()) {
    return
  }

  bootstrappedRootLoaderData = await loadRootLoaderData()
}

export const rootLoader = async (): Promise<RootLoaderData> => {
  const initialData = bootstrappedRootLoaderData
  bootstrappedRootLoaderData = null

  if (initialData) {
    return initialData
  }

  return loadRootLoaderData()
}
