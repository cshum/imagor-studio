import { useMemo } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'

import { LicenseActivationDialog } from '@/components/license-activation-dialog'
import { ErrorPage } from '@/components/ui/error-page'
import { Toaster } from '@/components/ui/sonner'
import { useTitle } from '@/hooks/use-title'
import { AccountLayout } from '@/layouts/account-layout'
import { SidebarLayout } from '@/layouts/sidebar-layout.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage.ts'
import { adminLoader, profileLoader, usersLoader } from '@/loaders/account-loader.ts'
import { adminSetupLoader } from '@/loaders/admin-setup-loader.ts'
import {
  requireAccountAuth,
  requireAdminAccountAuth,
  requireAuth,
  requireImageEditorAuth,
} from '@/loaders/auth-loader.ts'
import {
  embeddedLoader,
  embeddedLoaderDeps,
  embeddedValidateSearch,
} from '@/loaders/embedded-loader.ts'
import { galleryLoader, imageLoader } from '@/loaders/gallery-loader.ts'
import { imageEditorLoader } from '@/loaders/image-editor-loader.ts'
import { rootBeforeLoad, rootLoader } from '@/loaders/root-loader.ts'
import { AdminPage } from '@/pages/admin-page'
import { AdminSetupPage } from '@/pages/admin-setup-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImageEditorPage } from '@/pages/image-editor-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { ProfilePage } from '@/pages/profile-page'
import { UsersPage } from '@/pages/users-page'
import { initAuth, useAuthEffect } from '@/stores/auth-store.ts'
import {
  initializeFolderTreeCache,
  loadHomeTitle,
  loadRootFolders,
} from '@/stores/folder-tree-store.ts'
import { checkLicense, useLicense } from '@/stores/license-store'
import { initializeScrollPositions } from '@/stores/scroll-position-store.ts'
import { initializeSidebar } from '@/stores/sidebar-store.ts'
import { initializeTheme } from '@/stores/theme-store.ts'

const RootComponent = () => {
  useTitle()
  const { showDialog, setShowDialog } = useLicense()

  return (
    <>
      <Outlet />
      <Toaster />
      <LicenseActivationDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  )
}

const rootRoute = createRootRoute({
  beforeLoad: rootBeforeLoad,
  loader: rootLoader,
  component: RootComponent,
  errorComponent: ErrorPage,
  shouldReload: false,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const adminSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-setup',
  loader: adminSetupLoader,
  component: AdminSetupPage,
})

const baseLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'base-layout',
  beforeLoad: requireAuth,
  component: () => (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  ),
})

const rootPath = createRoute({
  getParentRoute: () => baseLayoutRoute,
  path: '/',
  component: () => {
    const galleryLoaderData = rootPath.useLoaderData()
    return (
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey=''>
        <Outlet />
      </GalleryPage>
    )
  },
  loader: () => galleryLoader({ params: { galleryKey: '' } }),
  shouldReload: false,
})

const rootImagePage = createRoute({
  getParentRoute: () => rootPath,
  path: '/$imageKey',
  loader: ({ params }) => imageLoader({ params: { ...params, galleryKey: '' } }),
  component: () => {
    const galleryLoaderData = rootPath.useLoaderData()
    const imageLoaderData = rootImagePage.useLoaderData()
    const { imageKey } = rootImagePage.useParams()
    return (
      <ImagePage
        imageLoaderData={imageLoaderData}
        galleryLoaderData={galleryLoaderData}
        galleryKey=''
        imageKey={imageKey}
      />
    )
  },
})

const rootImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params: { ...params, galleryKey: '' } }),
  shouldReload: false,
  component: () => {
    const loaderData = rootImageEditorRoute.useLoaderData()
    const { imageKey } = rootImageEditorRoute.useParams()
    return <ImageEditorPage galleryKey='' imageKey={imageKey} loaderData={loaderData} />
  },
})

const galleryRoute = createRoute({
  getParentRoute: () => baseLayoutRoute,
  path: '/gallery/$galleryKey',
  component: () => {
    const galleryLoaderData = galleryRoute.useLoaderData()
    const { galleryKey } = galleryRoute.useParams()
    return (
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey={galleryKey}>
        <Outlet />
      </GalleryPage>
    )
  },
  loader: galleryLoader,
  shouldReload: false,
})

const imagePage = createRoute({
  getParentRoute: () => galleryRoute,
  path: '/$imageKey',
  loader: ({ params }) => imageLoader({ params }),
  component: () => {
    const galleryLoaderData = galleryRoute.useLoaderData()
    const imageLoaderData = imagePage.useLoaderData()
    const { galleryKey, imageKey } = imagePage.useParams()
    return (
      <ImagePage
        imageLoaderData={imageLoaderData}
        galleryLoaderData={galleryLoaderData}
        galleryKey={galleryKey}
        imageKey={imageKey}
      />
    )
  },
})

const galleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery/$galleryKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params }),
  shouldReload: false,
  component: () => {
    const loaderData = galleryImageEditorRoute.useLoaderData()
    const { galleryKey, imageKey } = galleryImageEditorRoute.useParams()
    return <ImageEditorPage galleryKey={galleryKey} imageKey={imageKey} loaderData={loaderData} />
  },
})

const accountLayoutRoute = createRoute({
  getParentRoute: () => baseLayoutRoute,
  id: 'account-layout',
  beforeLoad: requireAccountAuth,
  loader: () => ({
    breadcrumb: {
      label: 'Account',
    },
  }),
  component: () => <AccountLayout />,
})

// Redirect /account to /account/profile
const accountRedirectRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account',
  component: () => <Navigate to='/account/profile' replace />,
})

const accountProfileRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/profile',
  loader: profileLoader,
  component: () => {
    const loaderData = accountProfileRoute.useLoaderData()
    return <ProfilePage loaderData={loaderData} />
  },
})

const accountAdminRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/admin',
  beforeLoad: requireAdminAccountAuth,
  loader: adminLoader,
  component: () => {
    const loaderData = accountAdminRoute.useLoaderData()
    return <AdminPage loaderData={loaderData} />
  },
})

const accountUsersRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/users',
  beforeLoad: requireAdminAccountAuth,
  loader: usersLoader,
  component: () => {
    const loaderData = accountUsersRoute.useLoaderData()
    return <UsersPage loaderData={loaderData.users} />
  },
})

// Check if embedded mode is enabled via environment variable
const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

// Embedded mode route - single root route with URL parameters
const embeddedEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: embeddedValidateSearch,
  loaderDeps: embeddedLoaderDeps,
  loader: embeddedLoader,
  component: () => {
    const loaderData = embeddedEditorRoute.useLoaderData()
    return (
      <ImageEditorPage
        galleryKey={loaderData.galleryKey}
        imageKey={loaderData.imageKey}
        loaderData={loaderData.imageEditorData}
      />
    )
  },
})

// Create different route trees based on embedded mode
const routeTree = isEmbeddedMode
  ? // Embedded mode: single root route with URL parameters
    rootRoute.addChildren([embeddedEditorRoute])
  : // Normal mode: full route tree
    rootRoute.addChildren([
      loginRoute,
      adminSetupRoute,
      rootImageEditorRoute,
      galleryImageEditorRoute,
      baseLayoutRoute.addChildren([
        rootPath.addChildren([rootImagePage]),
        galleryRoute.addChildren([imagePage]),
        accountLayoutRoute.addChildren([
          accountRedirectRoute,
          accountProfileRoute,
          accountAdminRoute,
          accountUsersRoute,
        ]),
      ]),
    ])

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
      loadRootFolders()
      loadHomeTitle()
    } else if (action.type === 'LOGOUT') {
      initializeTheme(localThemeStorage, 'class')
      initializeSidebar(localSidebarStorage)
    }
  })
  return <RouterProvider router={router} />
}
