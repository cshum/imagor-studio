import { createRoute, Outlet, redirect } from '@tanstack/react-router'

import { getSpaceRegistry, listSpaceInvitations, listSpaceMembers } from '@/cloud/org-api'
import { CloudAccountLayout } from '@/layouts/account-layout'
import { spaceSettingsLoader, usersLoader } from '@/cloud/account-loader'
import { requireAdminAccountAuth, requireImageEditorAuth } from '@/cloud/auth-loader'
import { canvasEditorLoader } from '@/cloud/canvas-editor-loader'
import { galleryLoader, imageLoader } from '@/cloud/gallery-loader'
import { cloudRootPageLoader } from '@/cloud/root-page-loader'
import { imageEditorLoader } from '@/cloud/image-editor-loader'
import { CloudRootPage } from '@/cloud/root-page'
import { CreateSpacePage } from '@/pages/create-space-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImageEditorPage } from '@/pages/image-editor-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { GeneralSection } from '@/pages/space-settings/general'
import { SpaceSettingsLayout } from '@/pages/space-settings/layout'
import { MembersSection } from '@/pages/space-settings/members'
import { SecuritySection } from '@/pages/space-settings/security'
import { StorageSection } from '@/pages/space-settings/storage'
import { UsersPage } from '@/pages/users-page'
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
    return <CloudRootPage loaderData={loaderData} />
  },
  loader: cloudRootPageLoader,
  shouldReload: false,
})

const createSpaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account/spaces/new',
  beforeLoad: requireAdminAccountAuth,
  component: CreateSpacePage,
})

const spaceRootRoute = createRoute({
  getParentRoute: () => baseLayoutRoute,
  path: '/spaces/$spaceKey',
  component: () => {
    const galleryLoaderData = spaceRootRoute.useLoaderData()
    return (
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey=''>
        <Outlet />
      </GalleryPage>
    )
  },
  loader: ({ params }) => galleryLoader({ params: { galleryKey: '', spaceKey: params.spaceKey } }),
  shouldReload: false,
})

const spaceRootImagePage = createRoute({
  getParentRoute: () => spaceRootRoute,
  path: '/$imageKey',
  loader: ({ params }) => imageLoader({ params: { ...params, galleryKey: '' } }),
  component: () => {
    const galleryLoaderData = spaceRootRoute.useLoaderData()
    const imageLoaderData = spaceRootImagePage.useLoaderData()
    const { imageKey } = spaceRootImagePage.useParams()
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

const spaceGalleryRoute = createRoute({
  getParentRoute: () => baseLayoutRoute,
  path: '/spaces/$spaceKey/gallery/$galleryKey',
  component: () => {
    const galleryLoaderData = spaceGalleryRoute.useLoaderData()
    const { galleryKey } = spaceGalleryRoute.useParams()
    return (
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey={galleryKey}>
        <Outlet />
      </GalleryPage>
    )
  },
  loader: ({ params }) => galleryLoader({ params }),
  shouldReload: false,
})

const spaceImagePage = createRoute({
  getParentRoute: () => spaceGalleryRoute,
  path: '/$imageKey',
  loader: ({ params }) => imageLoader({ params }),
  component: () => {
    const galleryLoaderData = spaceGalleryRoute.useLoaderData()
    const imageLoaderData = spaceImagePage.useLoaderData()
    const { galleryKey, imageKey } = spaceImagePage.useParams()
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

const spaceImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params: { ...params, galleryKey: '' } }),
  shouldReload: false,
  component: () => {
    const loaderData = spaceImageEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

const spaceGalleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/gallery/$galleryKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params }),
  shouldReload: false,
  component: () => {
    const loaderData = spaceGalleryImageEditorRoute.useLoaderData()
    const { galleryKey } = spaceGalleryImageEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

const spaceCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/editor/new',
  beforeLoad: requireImageEditorAuth,
  loader: ({ location }) => canvasEditorLoader({ search: location.searchStr }),
  shouldReload: false,
  component: () => {
    const loaderData = spaceCanvasEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

const spaceSettingsLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/spaces/$spaceKey/settings',
  beforeLoad: requireAdminAccountAuth,
  loader: ({ params: { spaceKey } }) => spaceSettingsLoader({ params: { spaceKey } }),
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return <SpaceSettingsLayout space={space} />
  },
})

const spaceSettingsIndexRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/',
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/spaces/$spaceKey/settings/general',
      params: { spaceKey: params.spaceKey },
    })
  },
})

const generalSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/general',
  loader: async ({ params: { spaceKey } }) => {
    try {
      const entries = await getSpaceRegistry(spaceKey)
      const map: Record<string, string> = {}
      entries.forEach((e) => {
        map[e.key] = e.value
      })
      return map
    } catch {
      return {} as Record<string, string>
    }
  },
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    const initialValues = generalSectionRoute.useLoaderData()
    return <GeneralSection space={space} initialValues={initialValues} />
  },
})

const storageSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/storage',
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return <StorageSection space={space} />
  },
})

const securitySectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/imagor',
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return <SecuritySection space={space} />
  },
})

const galleryRedirectRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/gallery',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/spaces/$spaceKey/settings/general', params })
  },
})

const membersSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/members',
  loader: async ({ params }) => {
    try {
      const [spaceMembers, invitations] = await Promise.all([
        listSpaceMembers(params.spaceKey),
        listSpaceInvitations(params.spaceKey),
      ])
      return { spaceMembers, invitations }
    } catch {
      return { spaceMembers: [], invitations: [] }
    }
  },
  shouldReload: false,
  component: () => {
    const { spaceMembers, invitations } = membersSectionRoute.useLoaderData()
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return (
      <MembersSection
        spaceKey={space.key}
        initialMembers={spaceMembers}
        initialInvitations={invitations}
        isShared={space.isShared}
        canLeave={space.canLeave}
      />
    )
  },
})

const accountUsersRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/users',
  beforeLoad: requireAdminAccountAuth,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? '',
  }),
  loaderDeps: ({ search: { q } }) => ({ q }),
  loader: ({ deps }) => usersLoader({ search: deps.q }),
  component: () => {
    const loaderData = accountUsersRoute.useLoaderData()
    const { q } = accountUsersRoute.useSearch()
    return <UsersPage loaderData={loaderData.users} searchQuery={q} />
  },
})

const cloudAccountLayoutRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  id: 'cloud-account-layout',
  component: () => <CloudAccountLayout />,
})

export const cloudRouteTree = rootRoute.addChildren([
  loginRoute,
  authCallbackRoute,
  adminSetupRoute,
  createSpaceRoute,
  canvasEditorRoute,
  galleryCanvasEditorRoute,
  rootImageEditorRoute,
  galleryImageEditorRoute,
  spaceImageEditorRoute,
  spaceGalleryImageEditorRoute,
  spaceCanvasEditorRoute,
  settingsLayoutRoute.addChildren([
    rootPath,
    spaceSettingsLayoutRoute.addChildren([
      spaceSettingsIndexRoute,
      generalSectionRoute,
      storageSectionRoute,
      securitySectionRoute,
      galleryRedirectRoute,
      membersSectionRoute,
    ]),
    cloudAccountLayoutRoute.addChildren([
      accountRedirectRoute,
      accountProfileRoute,
      accountAdminLayoutRoute.addChildren([
        accountAdminIndexRoute,
        accountAdminGeneralRoute,
        accountAdminStorageRoute,
        accountAdminImagorRoute,
        accountAdminLicenseRoute,
      ]),
      accountUsersRoute,
    ]),
  ]),
  baseLayoutRoute.addChildren([
    galleryRoute.addChildren([imagePage]),
    spaceRootRoute.addChildren([spaceRootImagePage]),
    spaceGalleryRoute.addChildren([spaceImagePage]),
  ]),
])
