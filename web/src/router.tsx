import { useMemo } from 'react'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { galleryLoader, imageLoader } from '@/api/dummy.ts'
import { AdminPanelLayout } from '@/layouts/admin-panel-layout'
import { AccountPage } from '@/pages/account-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { themeStore } from '@/stores/theme-store.ts'

const rootRoute = createRootRoute({
  loader: async () => {
    // Wait for theme to be loaded before rendering
    await themeStore.waitFor((state) => state.isLoaded)
    return null
  },
  component: () => (
    <>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})

const rootPath = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => {
    // Default to a specific gallery - you can change 'default' to your preferred default gallery
    return <Navigate to='/gallery/$galleryKey' params={{ galleryKey: 'default' }} replace />
  },
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
  component: () => (
    <AdminPanelLayout>
      <Outlet />
    </AdminPanelLayout>
  ),
})

const accountPage = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account',
  component: AccountPage,
})

const routeTree = rootRoute.addChildren([
  rootPath,
  adminPanelLayoutRoute.addChildren([galleryRoute.addChildren([galleryPage, imagePage])]),
  accountPage,
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
