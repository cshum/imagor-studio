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

export const rootBeforeLoad = async () => {
  await themeStore.waitFor((state) => state.isLoaded)
  await authStore.waitFor((state) => state.state !== 'loading')
}

export const rootLoader = async (): Promise<RootLoaderData> => {
  await rootBeforeLoad()

  const auth = getAuth()
  const includeUserRegistry = Boolean(auth.accessToken) && auth.experienceMode !== 'public-preview'
  const includeSystemRegistry = !auth.accessToken || !auth.multiTenant

  if (!auth.accessToken && auth.multiTenant) {
    return {}
  }

  let locale: string | null = null

  try {
    if (includeUserRegistry || includeSystemRegistry) {
      const { userRegistryEntries, systemRegistryEntries } = await getBootstrapRegistryPreferences(
        includeUserRegistry ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
        includeSystemRegistry ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
        {
          includeUser: includeUserRegistry,
          includeSystem: includeSystemRegistry,
        },
      )

      locale = userRegistryEntries[0]?.value || systemRegistryEntries[0]?.value || null
    }
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
