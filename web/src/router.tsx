import { useMemo } from 'react'
import { createRouter, RouterProvider } from '@tanstack/react-router'

import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage.ts'
import { CLOUD_BUILD, EMBEDDED_MODE } from '@/lib/runtime-mode'
import { cloudRouteTree } from '@/router/cloud-routes'
import { selfHostedRouteTree } from '@/router/selfhosted-routes'
import { embeddedEditorRoute, rootRoute } from '@/router/shared-routes'
import { initAuth, useAuthEffect } from '@/stores/auth-store.ts'
import {
  bootstrapCloudFolderTree,
  bootstrapSelfHostedFolderTree,
} from '@/stores/folder-tree-bootstrap'
import { initializeFolderTreeCache } from '@/stores/folder-tree-store.ts'
import { checkLicense } from '@/stores/license-store'
import { initializeScrollPositions } from '@/stores/scroll-position-store.ts'
import { initializeSidebar } from '@/stores/sidebar-store.ts'
import { initializeTheme } from '@/stores/theme-store.ts'

const routeTree = EMBEDDED_MODE
  ? rootRoute.addChildren([embeddedEditorRoute])
  : CLOUD_BUILD
    ? cloudRouteTree
    : selfHostedRouteTree

const createAppRouter = () => createRouter({ routeTree })

const localThemeStorage = new LocalConfigStorage('theme')
const localSidebarStorage = new LocalConfigStorage('sidebar_state')
const userThemeStorage = new UserRegistryConfigStorage('theme', localThemeStorage)
const userSidebarStorage = new UserRegistryConfigStorage('sidebar_state', localSidebarStorage)

initializeTheme(localThemeStorage, 'class')
initializeSidebar(localSidebarStorage)
initializeScrollPositions(new SessionConfigStorage('scroll_positions'))
initializeFolderTreeCache(new SessionConfigStorage('folder_tree'))
initAuth()
checkLicense()

export function AppRouter() {
  const router = useMemo(() => createAppRouter(), [])

  useAuthEffect((authState, action) => {
    if (action.type === 'INIT') {
      if (authState.state === 'authenticated') {
        initializeTheme(userThemeStorage, 'class')
        initializeSidebar(userSidebarStorage)
      }
      if (authState.multiTenant) {
        void bootstrapCloudFolderTree()
      } else {
        void bootstrapSelfHostedFolderTree()
      }
    } else if (action.type === 'LOGOUT') {
      initializeTheme(localThemeStorage, 'class')
      initializeSidebar(localSidebarStorage)
    }
  })

  return <RouterProvider router={router} />
}
