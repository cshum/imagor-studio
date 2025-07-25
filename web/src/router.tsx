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

import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { RootLayout } from '@/layouts/root-layout'
import { HomePage } from '@/pages/home-page'
import { AccountPage } from '@/pages/account-page'
import { homeLoader, imageLoader } from '@/api/dummy.ts'

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

const adminPanelLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'admin-panel',
  component: () => (
    <AdminPanelLayout hideFooter={true}>
      <Outlet />
    </AdminPanelLayout>
  ),
})

const accountLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'account-layout',
  component: () => (
    <AdminPanelLayout>
      <Outlet />
    </AdminPanelLayout>
  ),
})

// Build the route tree
const routeTree = rootRoute.addChildren([
  createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => {
      // Your existing redirect logic here
      return <Navigate to="/home" replace />
    },
  }),
  adminPanelLayoutRoute.addChildren([
    createRoute({
      getParentRoute: () => adminPanelLayoutRoute,
      path: '/home',
      component: HomePage,
      loader: homeLoader,
    }),
    createRoute({
      getParentRoute: () => adminPanelLayoutRoute,
      path: '/image/$id',
      component: HomePage,
      loader: imageLoader,
    }),
  ]),
  accountLayoutRoute.addChildren([
    createRoute({
      getParentRoute: () => accountLayoutRoute,
      path: '/account',
      component: AccountPage,
    }),
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
