import { useMemo } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'

import { ErrorPage } from '@/components/ui/error-page'
import { Toaster } from '@/components/ui/sonner'
import { AccountLayout } from '@/layouts/account-layout'
import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { adminLoader, profileLoader, usersLoader } from '@/loaders/account-loader.ts'
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
    // Wait for theme to be loaded before rendering
    await themeStore.waitFor((state) => state.isLoaded)
    await authStore.waitFor((state) => state.state !== 'loading')

    const currentAuth = authStore.getState()

    // If it's first run, redirect to admin setup
    if (currentAuth.isFirstRun === true && currentAuth.state === 'unauthenticated') {
      throw redirect({ to: '/admin-setup' })
    }

    return null
  },
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
  errorComponent: ({ error }) => (
    <ErrorPage
      error={error}
      title='Failed to load data'
      description='There was an error loading the requested data. Please try again.'
    />
  ),
})

const rootPath = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    return <Navigate to='/gallery/$galleryKey' params={{ galleryKey: 'default' }} replace />
  },
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

const adminPanelLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin-panel',
  beforeLoad: async () => {
    const currentAuth = await authStore.waitFor((state) => state.state !== 'loading')

    // If unauthenticated and not first run, redirect to login
    if (currentAuth.state === 'unauthenticated' && currentAuth.isFirstRun === false) {
      throw redirect({ to: '/login' })
    }

    return {}
  },
  context: () => ({
    breadcrumb: {
      label: 'Home',
    },
  }),
  component: () => (
    <AdminPanelLayout>
      <Outlet />
    </AdminPanelLayout>
  ),
})

const galleryRoute = createRoute({
  getParentRoute: () => adminPanelLayoutRoute,
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
  context: () => ({
    breadcrumb: {
      label: (loaderData: any, params: any) => params?.imageKey || 'Image',
    },
  }),
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
  getParentRoute: () => adminPanelLayoutRoute,
  id: 'account-layout',
  context: () => ({
    breadcrumb: {
      label: 'Account',
    },
  }),
  beforeLoad: async () => {
    const auth = authStore.getState()

    // If still loading, wait
    if (auth.state === 'loading') {
      await authStore.waitFor((state) => state.state !== 'loading')
    }

    const currentAuth = authStore.getState()

    if (currentAuth.state !== 'authenticated') {
      throw redirect({ to: '/login' })
    }

    return {}
  },
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
  context: () => ({
    breadcrumb: {
      label: 'Profile',
    },
  }),
  loader: profileLoader,
  component: () => {
    const loaderData = accountProfileRoute.useLoaderData()
    return <ProfilePage loaderData={loaderData} />
  },
})

const accountAdminRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/admin',
  context: () => ({
    breadcrumb: {
      label: 'Admin',
    },
  }),
  beforeLoad: async () => {
    const auth = authStore.getState()

    // Only allow admin users
    if (auth.profile?.role !== 'admin') {
      throw redirect({ to: '/account/profile' })
    }

    return {}
  },
  loader: adminLoader,
  component: () => {
    const loaderData = accountAdminRoute.useLoaderData()
    return <AdminPage loaderData={loaderData} />
  },
})

const accountUsersRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/users',
  context: () => ({
    breadcrumb: {
      label: 'Users',
    },
  }),
  beforeLoad: async () => {
    const auth = authStore.getState()

    // Only allow admin users
    if (auth.profile?.role !== 'admin') {
      throw redirect({ to: '/account/profile' })
    }

    return {}
  },
  loader: usersLoader,
  component: () => {
    const loaderData = accountUsersRoute.useLoaderData()
    return <UsersPage loaderData={loaderData.users} />
  },
})

const routeTree = rootRoute.addChildren([
  rootPath,
  loginRoute,
  adminSetupRoute,
  adminPanelLayoutRoute.addChildren([
    galleryRoute.addChildren([galleryPage, imagePage]),
    accountLayoutRoute.addChildren([
      accountRedirectRoute,
      accountProfileRoute,
      accountAdminRoute,
      accountUsersRoute,
    ]),
  ]),
])

// Create router
const createAppRouter = () => createRouter({ routeTree })

export function AppRouter() {
  const router = useMemo(() => createAppRouter(), [])
  return <RouterProvider router={router} />
}

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
