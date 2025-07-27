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

const rootRoute = createRootRoute({
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
    return <Navigate to='/gallery/$galleryKey' params={{galleryKey: 'default'}} replace />
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

// Updated gallery route with galleryKey parameter
const galleryRoute = createRoute({
  getParentRoute: () => adminPanelLayoutRoute,
  path: '/gallery/$galleryKey',
  component: () => {
    const galleryLoaderData = galleryRoute.useLoaderData()
    const { galleryKey } = galleryRoute.useParams()
    return (
      <GalleryPage
        galleryLoaderData={galleryLoaderData}
        galleryKey={galleryKey}
      >
        <Outlet />
      </GalleryPage>
    )
  },
  // Updated loader to accept galleryKey parameter
  loader: ({ params }) => galleryLoader(params.galleryKey),
})

const galleryPage = createRoute({
  getParentRoute: () => galleryRoute,
  id: 'gallery-page',
})

// Updated image route with imageKey parameter instead of id
const imagePage = createRoute({
  getParentRoute: () => galleryRoute,
  path: '/$imageKey',
  loader: ({ params }) => imageLoader({
    params: {
      id: params.imageKey, // Map imageKey to id for existing loader
      galleryKey: params.galleryKey
    }
  }),
  loaderDeps: () => ({ ts: Date.now() }),
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
  adminPanelLayoutRoute.addChildren([
    galleryRoute.addChildren([
      galleryPage,
      imagePage,
    ]),
  ]),
  accountPage,
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
