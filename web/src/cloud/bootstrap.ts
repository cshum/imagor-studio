import type { ConfigStorage } from '@/lib/config-storage/config-storage'
import type { Auth } from '@/stores/auth/shared'
import { bootstrapCloudFolderTree } from '@/stores/folder-tree-bootstrap'
import { initializeSidebar } from '@/stores/sidebar-store'
import { initializeTheme } from '@/stores/theme-store'

export function handleCloudAuthInit(
  authState: Auth,
  userThemeStorage: ConfigStorage,
  userSidebarStorage: ConfigStorage,
) {
  if (authState.state === 'authenticated') {
    initializeTheme(userThemeStorage, 'class')
    initializeSidebar(userSidebarStorage)
  }

  void bootstrapCloudFolderTree()
}
