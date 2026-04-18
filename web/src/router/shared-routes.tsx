import { useTranslation } from 'react-i18next'
import {
  createRootRoute,
  createRoute,
  Navigate,
  Outlet,
  redirect,
} from '@tanstack/react-router'

import { LicenseActivationDialog } from '@/components/license/license-activation-dialog.tsx'
import { ErrorPage } from '@/components/ui/error-page'
import { Toaster } from '@/components/ui/sonner'
import { useTitle } from '@/hooks/use-title'
import { SidebarLayout } from '@/layouts/sidebar-layout.tsx'
import {
  adminGeneralLoader,
  adminImagorLoader,
  adminLicenseLoader,
  adminStorageLoader,
  profileLoader,
} from '@/loaders/account-loader.ts'
import { adminSetupLoader } from '@/loaders/admin-setup-loader.ts'
import { authCallbackLoader } from '@/loaders/auth-callback-loader.ts'
import {
  requireAccountAuth,
  requireAdminAccountAuth,
  requireAuth,
  requireImageEditorAuth,
} from '@/loaders/auth-loader.ts'
import { canvasEditorLoader } from '@/loaders/canvas-editor-loader.ts'
import {
  embeddedLoader,
  embeddedLoaderDeps,
  embeddedValidateSearch,
} from '@/loaders/embedded-loader.ts'
import { galleryLoader, imageLoader } from '@/loaders/gallery-loader.ts'
import { imageEditorLoader } from '@/loaders/image-editor-loader.ts'
import { rootBeforeLoad, rootLoader } from '@/loaders/root-loader.ts'
import { AdminSetupPage } from '@/pages/admin-setup-page'
import { AdminGeneralSection } from '@/pages/admin/general'
import { AdminImagorSection } from '@/pages/admin/imagor'
import { AdminLayout } from '@/pages/admin/layout'
import { AdminLicenseSection } from '@/pages/admin/license'
import { AdminStorageSection } from '@/pages/admin/storage'
import { AuthCallbackPage } from '@/pages/auth-callback-page.tsx'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImageEditorPage } from '@/pages/image-editor-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { ProfilePage } from '@/pages/profile-page'
import { getAuth } from '@/stores/auth-store.ts'
import { useLicense } from '@/stores/license-store'

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

export const rootRoute = createRootRoute({
  beforeLoad: rootBeforeLoad,
  loader: rootLoader,
  component: RootComponent,
  errorComponent: ErrorPage,
  shouldReload: false,
})

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

export const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  loader: authCallbackLoader,
  component: AuthCallbackPage,
})

export const adminSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-setup',
  loader: adminSetupLoader,
  component: AdminSetupPage,
})

export const baseLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'base-layout',
  beforeLoad: requireAuth,
  component: () => (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  ),
})

export const settingsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'settings-layout',
  beforeLoad: requireAuth,
  component: () => <Outlet />,
})

export const accountLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  id: 'account-layout',
  beforeLoad: requireAccountAuth,
  component: () => <Outlet />,
})

export const accountRedirectRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account',
  component: () => <Navigate to='/account/profile' replace />,
})

export const accountProfileRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/profile',
  loader: profileLoader,
  component: () => {
    const { t } = useTranslation()
    const loaderData = accountProfileRoute.useLoaderData()
    return (
      <>
        <div className='mb-8'>
          <h1 className='text-2xl font-semibold tracking-tight'>{t('pages.profile.title')}</h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('pages.profile.titleDescription')}
          </p>
        </div>
        <ProfilePage loaderData={loaderData} />
      </>
    )
  },
})

export const accountAdminLayoutRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/admin',
  beforeLoad: requireAdminAccountAuth,
  component: () => <AdminLayout />,
})

export const accountAdminIndexRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/account/admin/general' })
  },
})

export const accountAdminGeneralRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/general',
  loader: adminGeneralLoader,
  shouldReload: false,
  component: () => {
    const loaderData = accountAdminGeneralRoute.useLoaderData()
    return <AdminGeneralSection loaderData={loaderData} />
  },
})

export const accountAdminStorageRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/storage',
  loader: adminStorageLoader,
  shouldReload: false,
  component: () => {
    const { storageStatus } = accountAdminStorageRoute.useLoaderData()
    return <AdminStorageSection storageStatus={storageStatus} />
  },
})

export const accountAdminImagorRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/imagor',
  loader: adminImagorLoader,
  shouldReload: false,
  component: () => {
    const { imagorStatus } = accountAdminImagorRoute.useLoaderData()
    return <AdminImagorSection imagorStatus={imagorStatus} />
  },
})

export const accountAdminLicenseRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/license',
  loader: adminLicenseLoader,
  shouldReload: false,
  component: () => {
    const { licenseStatus } = accountAdminLicenseRoute.useLoaderData()
    return <AdminLicenseSection licenseStatus={licenseStatus} />
  },
})

export const galleryRoute = createRoute({
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

export const imagePage = createRoute({
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

export const rootImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params: { ...params, galleryKey: '' } }),
  shouldReload: false,
  component: () => {
    const loaderData = rootImageEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

export const canvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/new',
  beforeLoad: requireImageEditorAuth,
  loader: ({ location }) => canvasEditorLoader({ search: location.searchStr }),
  shouldReload: false,
  component: () => {
    const loaderData = canvasEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

export const galleryCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery/$galleryKey/editor/new',
  beforeLoad: requireImageEditorAuth,
  loader: ({ location }) => canvasEditorLoader({ search: location.searchStr }),
  shouldReload: false,
  component: () => {
    const loaderData = galleryCanvasEditorRoute.useLoaderData()
    const { galleryKey } = galleryCanvasEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

export const galleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/gallery/$galleryKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params }),
  shouldReload: false,
  component: () => {
    const loaderData = galleryImageEditorRoute.useLoaderData()
    const { galleryKey } = galleryImageEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

export const embeddedEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: embeddedValidateSearch,
  loaderDeps: embeddedLoaderDeps,
  loader: embeddedLoader,
  component: () => {
    const loaderData = embeddedEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData.imageEditorData} />
  },
})

export const rootPathBeforeLoad = async (context: unknown) => {
  const auth = getAuth()
  if (auth.multiTenant) {
    return requireAdminAccountAuth(context as {
      location?: { pathname: string; search: Record<string, unknown> }
    })
  }
}
