import { useMemo } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'

import { ErrorPage } from '@/components/ui/error-page'
import { Toaster } from '@/components/ui/sonner'
import { AccountLayout } from '@/layouts/account-layout'
import { BasePanelLayout } from '@/layouts/base-panel-layout'
import { adminLoader, profileLoader, usersLoader } from '@/loaders/account-loader.ts'
import { requireAccountAuth, requireAdminAccountAuth, requireAuth } from '@/loaders/auth-loader.ts'
import { galleryLoader, imageLoader } from '@/loaders/gallery-loader.ts'
import { AdminPage } from '@/pages/admin-page'
import { AdminSetupPage } from '@/pages/admin-setup-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { ProfilePage } from '@/pages/profile-page'
import { UsersPage } from '@/pages/users-page'
import { authStore } from '@/stores/auth-store.ts'
import { themeStore } from '@/stores/theme-store.ts'

const rootRoute = createRootRoute({
  beforeLoad: async () => {
    await themeStore.waitFor((state) => state.isLoaded)
    await authStore.waitFor((state) => state.state !== 'loading')
  },
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  errorComponent: ErrorPage,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const adminSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-setup',
  component: AdminSetupPage,
})

const baseLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'gallery-layout',
  beforeLoad: requireAuth,
  loader: () => ({
    breadcrumb: { label: 'Home' },
  }),
  component: () => (
    <BasePanelLayout>
      <Outlet />
    </BasePanelLayout>
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
  loader: () => galleryLoader(''),
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
  loader: ({ params }) => galleryLoader(params.galleryKey),
})

const galleryPage = createRoute({
  getParentRoute: () => galleryRoute,
  id: 'gallery-page',
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  adminSetupRoute,
  baseLayoutRoute.addChildren([
    rootPath.addChildren([rootImagePage]),
    galleryRoute.addChildren([galleryPage, imagePage]),
    accountLayoutRoute.addChildren([
      accountRedirectRoute,
      accountProfileRoute,
      accountAdminRoute,
      accountUsersRoute,
    ]),
  ]),
])

const createAppRouter = () => createRouter({ routeTree })

export function AppRouter() {
  const router = useMemo(() => createAppRouter(), [])
  return <RouterProvider router={router} />
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
