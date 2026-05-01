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

export const rootLoader = async (): Promise<RootLoaderData> => {
  const auth = getAuth()
  if (!auth.accessToken) {
    if (!auth.multiTenant) {
      // Unauthenticated self-hosted pages can still use the public system default language,
      // but there is no user registry to read yet.
      await initializeLocale({ includeUserRegistry: false, includeSystemRegistry: true })
    }
    return {}
  }

  await initializeLocale()

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
