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

import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { AccountLayout } from '@/layouts/account-layout'
import { galleryLoader, imageLoader } from '@/loaders/gallery-loader.ts'
import { profileLoader, adminLoader } from '@/loaders/account-loader.ts'
import { ProfilePage } from '@/pages/profile-page'
import { AdminPage } from '@/pages/admin-page'
import { AdminSetupPage } from '@/pages/admin-setup-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { authStore } from '@/stores/auth-store.ts'
import { themeStore } from '@/stores/theme-store.ts'
import { Toaster } from '@/components/ui/sonner'

const rootRoute = createRootRoute({
  loader: async () => {
    // Wait for theme to be loaded before rendering
    await themeStore.waitFor((state) => state.isLoaded)
    await authStore.waitFor((state) => state.state !== 'loading')
    return null
  },
  component: () => (
    <>
      <Outlet />
      <Toaster />
    </>
  ),
})

const rootPath = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    // Always redirect to gallery - AuthenticatedRoute will handle auth logic
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
    const auth = authStore.getState()

    // If still loading, wait
    if (auth.state === 'loading') {
      await authStore.waitFor((state) => state.state !== 'loading')
    }

    const currentAuth = authStore.getState()

    // If it's first run, redirect to admin setup
    if (currentAuth.isFirstRun === true && currentAuth.state === 'unauthenticated') {
      throw redirect({ to: '/admin-setup' })
    }

    // If unauthenticated and not first run, redirect to login
    if (currentAuth.state === 'unauthenticated' && currentAuth.isFirstRun === false) {
      throw redirect({ to: '/login' })
    }

    // Allow authenticated or guest users
    return {}
  },
  component: () => (
    <AdminPanelLayout hideFooter={true}>
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
  getParentRoute: () => rootRoute,
  id: 'account-layout',
  beforeLoad: async () => {
    const auth = authStore.getState()

    // If still loading, wait
    if (auth.state === 'loading') {
      await authStore.waitFor((state) => state.state !== 'loading')
    }

    const currentAuth = authStore.getState()

    // If it's first run, redirect to admin setup
    if (currentAuth.isFirstRun === true && currentAuth.state === 'unauthenticated') {
      throw redirect({ to: '/admin-setup' })
    }

    // If unauthenticated and not first run, redirect to login
    if (currentAuth.state === 'unauthenticated' && currentAuth.isFirstRun === false) {
      throw redirect({ to: '/login' })
    }

    // Allow authenticated or guest users
    return {}
  },
  component: () => (
    <AdminPanelLayout>
      <AccountLayout />
    </AdminPanelLayout>
  ),
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

const routeTree = rootRoute.addChildren([
  rootPath,
  loginRoute,
  adminSetupRoute,
  adminPanelLayoutRoute.addChildren([galleryRoute.addChildren([galleryPage, imagePage])]),
  accountLayoutRoute.addChildren([accountRedirectRoute, accountProfileRoute, accountAdminRoute]),
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
