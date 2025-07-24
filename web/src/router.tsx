import { useMemo } from 'react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  Navigate,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

// Import your existing components and loaders
import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { RootLayout } from '@/layouts/root-layout'
import { HomePage } from '@/pages/home-page'
import { AccountPage } from '@/pages/account-page'
import { generateDummyImages } from '@/lib/generate-dummy-images'

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

// Index route with redirect logic
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    // Your existing redirect logic here
    return <Navigate to="/home" replace />
  },
})

// Layout route for admin panel
const adminPanelLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin-panel',
  component: () => (
    <AdminPanelLayout hideFooter={true}>
      <Outlet />
    </AdminPanelLayout>
  ),
})

// Home route
const homeRoute = createRoute({
  getParentRoute: () => adminPanelLayoutRoute,
  path: '/home',
  component: HomePage,
  loader: async () => {
    // Your loader logic here
    const images = generateDummyImages(10000)
    return { images }
  },
})

// Image detail route with params
const imageRoute = createRoute({
  getParentRoute: () => adminPanelLayoutRoute,
  path: '/image/$id',
  component: HomePage,
  loader: async ({ params }) => {
    // Preload image data based on ID
    const images = generateDummyImages(10000)
    const selectedImage = images.find(img => img.id === params.id)
    return { images, selectedImage }
  },
})

// Account layout route
const accountLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'account-layout',
  component: () => (
    <AdminPanelLayout>
      <Outlet />
    </AdminPanelLayout>
  ),
})

// Account route
const accountRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account',
  component: AccountPage,
})

// Build the route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  adminPanelLayoutRoute.addChildren([
    homeRoute,
    imageRoute,
  ]),
  accountLayoutRoute.addChildren([
    accountRoute,
  ]),
])

// Create router
const createAppRouter = () =>
  createRouter({
    routeTree,
    defaultPreload: 'intent',
  })

export function AppRouter() {
  const router = useMemo(() => createAppRouter(), [])

  return (
    <RootLayout>
      <RouterProvider router={router} />
    </RootLayout>
  )
}

// Type registration
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
