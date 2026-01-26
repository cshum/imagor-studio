import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { authStore, getAuth } from '@/stores/auth-store.ts'
import { folderTreeStore } from '@/stores/folder-tree-store.ts'
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
  if (!getAuth().accessToken) {
    return {}
  }
  if (getAuth().state === 'authenticated') {
    await initializeLocale()
  }
  // Get home title from the folder tree store
  const folderTreeState = await folderTreeStore.waitFor((state) => state.isHomeTitleLoaded)
  const homeTitle = folderTreeState.homeTitle
  const breadcrumb: BreadcrumbItem = {
    label: homeTitle,
    href: '/',
  }
  return { breadcrumb }
}
