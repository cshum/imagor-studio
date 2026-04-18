import { createRoute } from '@tanstack/react-router'

import { imageLoader } from '@/loaders/gallery-loader.ts'
import { ImagePage } from '@/pages/image-page.tsx'
import { SelfHostedRootPage } from '@/pages/selfhosted/root-page'
import { selfHostedRootPageLoader } from '@/loaders/selfhosted/root-page-loader'
import {
  accountAdminGeneralRoute,
  accountAdminImagorRoute,
  accountAdminIndexRoute,
  accountAdminLayoutRoute,
  accountAdminLicenseRoute,
  accountAdminStorageRoute,
  accountLayoutRoute,
  accountProfileRoute,
  accountRedirectRoute,
  adminSetupRoute,
  authCallbackRoute,
  baseLayoutRoute,
  canvasEditorRoute,
  galleryCanvasEditorRoute,
  galleryImageEditorRoute,
  galleryRoute,
  imagePage,
  loginRoute,
  rootImageEditorRoute,
  rootPathBeforeLoad,
  rootRoute,
  settingsLayoutRoute,
} from '@/router/shared-routes'

const rootPath = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/',
  beforeLoad: rootPathBeforeLoad,
  component: () => {
    const loaderData = rootPath.useLoaderData()
    return <SelfHostedRootPage loaderData={loaderData} />
  },
  loader: selfHostedRootPageLoader,
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

export const selfHostedRouteTree = rootRoute.addChildren([
  loginRoute,
  authCallbackRoute,
  adminSetupRoute,
  canvasEditorRoute,
  galleryCanvasEditorRoute,
  rootImageEditorRoute,
  galleryImageEditorRoute,
  settingsLayoutRoute.addChildren([
    rootPath.addChildren([rootImagePage]),
    accountLayoutRoute.addChildren([
      accountRedirectRoute,
      accountProfileRoute,
      accountAdminLayoutRoute.addChildren([
        accountAdminIndexRoute,
        accountAdminGeneralRoute,
        accountAdminStorageRoute,
        accountAdminImagorRoute,
        accountAdminLicenseRoute,
      ]),
    ]),
  ]),
  baseLayoutRoute.addChildren([galleryRoute.addChildren([imagePage])]),
])
