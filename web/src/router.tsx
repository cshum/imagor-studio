import { useMemo } from 'react'
import {
  createRouter,
  createRootRoute,
  createRoute,
  Navigate,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { RootLayout } from '@/layouts/root-layout'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { AccountPage } from '@/pages/account-page'
import { galleryLoader, imageLoader } from '@/api/dummy.ts'
import { ImagePage } from '@/pages/image-page.tsx'

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

const galleryRoute = createRoute({
  getParentRoute: () => adminPanelLayoutRoute,
  id: 'gallery',
  component: () => {
    const galleryLoaderData = galleryRoute.useLoaderData()
    return <GalleryPage galleryLoaderData={galleryLoaderData }><Outlet /></GalleryPage>
  },
  loader: galleryLoader,
})

const rootPath = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    return <Navigate to="/gallery" replace />
  },
})

const galleryPage = createRoute({
  getParentRoute: () => galleryRoute,
  path: '/gallery',
})

const imagePage = createRoute({
  getParentRoute: () => galleryRoute,
  path: '/gallery/$id',
  loader: imageLoader,
  loaderDeps: () => ({ ts: Date.now() }),
  component: () => {
    const galleryLoaderData = galleryRoute.useLoaderData()
    const imageLoaderData = imagePage.useLoaderData()
    return <ImagePage imageLoaderData={imageLoaderData} galleryLoaderData={galleryLoaderData}/>
  },
})

// Build the route tree
const routeTree = rootRoute.addChildren([
  rootPath,
  adminPanelLayoutRoute.addChildren([
    galleryRoute.addChildren([
      galleryPage,
      imagePage,
    ]),
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
