import { getBootstrapRegistryPreferences } from '@/api/registry-api'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { authStore, getAuth } from '@/stores/auth-store.ts'
import { folderTreeStore } from '@/stores/folder-tree-store.ts'
import { licenseStore } from '@/stores/license-store.ts'
import { initializeLocale } from '@/stores/locale-store.ts'
import { themeStore } from '@/stores/theme-store.ts'

export const rootBeforeLoad = async () => {
  await themeStore.waitFor((state) => state.isLoaded)
  await authStore.waitFor((state) => state.state !== 'loading')
}

export interface RootLoaderData {
  breadcrumb?: BreadcrumbItem
}

const DEFAULT_LANGUAGE_REGISTRY_KEY = 'config.app_default_language'

const resolveLocale = async (accessToken: string | null, multiTenant: boolean) => {
  let locale: string | null = null

  try {
    const { userRegistryEntries, systemRegistryEntries } = await getBootstrapRegistryPreferences(
      accessToken ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
      !accessToken || !multiTenant ? [DEFAULT_LANGUAGE_REGISTRY_KEY] : [],
      {
        includeUser: Boolean(accessToken),
        includeSystem: !accessToken || !multiTenant,
      },
    )

    locale = userRegistryEntries[0]?.value || systemRegistryEntries[0]?.value || null
  } catch {
    // Root bootstrap falls back to the current i18n default.
  }

  await initializeLocale(locale)
}

export const rootLoader = async (): Promise<RootLoaderData> => {
  const auth = getAuth()
  if (!auth.accessToken) {
    if (!auth.multiTenant) {
      await resolveLocale(null, false)
    }
    return {}
  }

  await resolveLocale(auth.accessToken, auth.multiTenant)

  if (auth.multiTenant) {
    return {}
  }

  await licenseStore.waitFor((state) => state.isBrandLoaded)

  // Get home title from the folder tree store
  const folderTreeState = await folderTreeStore.waitFor((state) => state.isHomeTitleLoaded)
  const homeTitle = folderTreeState.homeTitle
  const breadcrumb: BreadcrumbItem = {
    label: homeTitle,
    href: '/',
  }
  return { breadcrumb }
}
