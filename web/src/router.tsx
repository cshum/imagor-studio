import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  redirect,
  RouterProvider,
} from '@tanstack/react-router'

import { getSpaceRegistry, listSpaceInvitations, listSpaceMembers } from '@/api/org-api'
import { LicenseActivationDialog } from '@/components/license/license-activation-dialog.tsx'
import { ErrorPage } from '@/components/ui/error-page'
import { Toaster } from '@/components/ui/sonner'
import { useTitle } from '@/hooks/use-title'
import { AccountLayout } from '@/layouts/account-layout'
import { SidebarLayout } from '@/layouts/sidebar-layout.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage.ts'
import { resolveSpace } from '@/lib/space'
import {
  adminGeneralLoader,
  adminImagorLoader,
  adminLicenseLoader,
  adminStorageLoader,
  profileLoader,
  spaceSettingsLoader,
  usersLoader,
} from '@/loaders/account-loader.ts'
import { adminSetupLoader } from '@/loaders/admin-setup-loader.ts'
import { authCallbackLoader } from '@/loaders/auth-callback-loader.ts'
import {
  requireAccountAuth,
  requireAdminAccountAuth,
  requireAuth,
  requireImageEditorAuth,
  requireSelfHostedAdminAccountAuth,
  requireSelfHostedImageEditorAuth,
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
import { rootPageLoader } from '@/loaders/root-page-loader'
import { AdminSetupPage } from '@/pages/admin-setup-page'
import { AdminGeneralSection } from '@/pages/admin/general'
import { AdminImagorSection } from '@/pages/admin/imagor'
import { AdminLayout } from '@/pages/admin/layout'
import { AdminLicenseSection } from '@/pages/admin/license'
import { AdminStorageSection } from '@/pages/admin/storage'
import { AuthCallbackPage } from '@/pages/auth-callback-page.tsx'
import { CreateSpacePage } from '@/pages/create-space-page'
import { GalleryPage } from '@/pages/gallery-page.tsx'
import { ImageEditorPage } from '@/pages/image-editor-page.tsx'
import { ImagePage } from '@/pages/image-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { ProfilePage } from '@/pages/profile-page'
import { RootPage } from '@/pages/root-page'
import { GeneralSection } from '@/pages/space-settings/general'
import { SpaceSettingsLayout } from '@/pages/space-settings/layout'
import { MembersSection } from '@/pages/space-settings/members'
import { SecuritySection } from '@/pages/space-settings/security'
import { StorageSection } from '@/pages/space-settings/storage'
import { UsersPage } from '@/pages/users-page'
import { getAuth, initAuth, useAuthEffect } from '@/stores/auth-store.ts'
import { initializeFolderTreeCache } from '@/stores/folder-tree-store.ts'
import { checkLicense, useLicense } from '@/stores/license-store'
import { initializeScrollPositions } from '@/stores/scroll-position-store.ts'
import { initializeSidebar } from '@/stores/sidebar-store.ts'
import { initializeTheme } from '@/stores/theme-store.ts'

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

const rootRoute = createRootRoute({
  beforeLoad: rootBeforeLoad,
  loader: rootLoader,
  component: RootComponent,
  errorComponent: ErrorPage,
  shouldReload: false,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  loader: authCallbackLoader,
  component: AuthCallbackPage,
})

const adminSetupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin-setup',
  loader: adminSetupLoader,
  component: AdminSetupPage,
})

const baseLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'base-layout',
  beforeLoad: requireAuth,
  component: () => (
    <SidebarLayout>
      <Outlet />
    </SidebarLayout>
  ),
})

const spaceBaseLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey',
  beforeLoad: requireAuth,
  loader: async ({ params }) => ({ space: await resolveSpace(params.spaceKey) }),
  component: () => {
    const { space } = spaceBaseLayoutRoute.useLoaderData()
    return (
      <SidebarLayout space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}>
        <Outlet />
      </SidebarLayout>
    )
  },
})

const rootPath = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/',
  // In multi-tenant (SaaS) mode, render the spaces list at the base path (no sidebar).
  // In self-hosted mode, render the root gallery wrapped in SidebarLayout.
  beforeLoad: async (context) => {
    const auth = getAuth()
    if (auth.multiTenant) {
      // Spaces list requires admin in multi-tenant mode
      return requireAdminAccountAuth(context)
    }
  },
  component: () => {
    const loaderData = rootPath.useLoaderData()
    return <RootPage loaderData={loaderData} />
  },
  loader: rootPageLoader,
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

const rootImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/$imageKey/editor',
  beforeLoad: requireSelfHostedImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params: { ...params, galleryKey: '' } }),
  shouldReload: false,
  component: () => {
    const loaderData = rootImageEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

const galleryRoute = createRoute({
  getParentRoute: () => baseLayoutRoute,
  path: '/f/$galleryKey',
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

const canvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/editor/new',
  beforeLoad: requireSelfHostedImageEditorAuth,
  loader: ({ location }) => canvasEditorLoader({ search: location.searchStr }),
  shouldReload: false,
  component: () => {
    const loaderData = canvasEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

const galleryCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/f/$galleryKey/editor/new',
  beforeLoad: requireImageEditorAuth,
  loader: ({ location }) => canvasEditorLoader({ search: location.searchStr }),
  shouldReload: false,
  component: () => {
    const loaderData = galleryCanvasEditorRoute.useLoaderData()
    const { galleryKey } = galleryCanvasEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

const galleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/f/$galleryKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: ({ params }) => imageEditorLoader({ params }),
  shouldReload: false,
  component: () => {
    const loaderData = galleryImageEditorRoute.useLoaderData()
    const { galleryKey } = galleryImageEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

// ─── Space-scoped gallery routes: /spaces/$spaceKey/... ──────────────────────

// /spaces/$spaceKey  →  root gallery for this space (galleryKey = '')
const spaceRootRoute = createRoute({
  getParentRoute: () => spaceBaseLayoutRoute,
  path: '/',
  component: () => {
    const galleryLoaderData = spaceRootRoute.useLoaderData()
    const { space } = spaceBaseLayoutRoute.useLoaderData()
    return (
      <GalleryPage
        galleryLoaderData={galleryLoaderData}
        galleryKey=''
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      >
        <Outlet />
      </GalleryPage>
    )
  },
  loader: async ({ params }) => {
    const space = await resolveSpace(params.spaceKey)
    return galleryLoader({
      params: {
        galleryKey: '',
        spaceKey: params.spaceKey,
        spaceID: space.id,
        spaceName: space.name,
      },
    })
  },
  shouldReload: false,
})

// /spaces/$spaceKey/$imageKey  →  image detail at the root of a space
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

// /spaces/$spaceKey/f/$galleryKey  →  nested folder inside a space
const spaceGalleryRoute = createRoute({
  getParentRoute: () => spaceBaseLayoutRoute,
  path: '/f/$galleryKey',
  component: () => {
    const galleryLoaderData = spaceGalleryRoute.useLoaderData()
    const { space } = spaceBaseLayoutRoute.useLoaderData()
    const { galleryKey } = spaceGalleryRoute.useParams()
    return (
      <GalleryPage
        galleryLoaderData={galleryLoaderData}
        galleryKey={galleryKey}
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      >
        <Outlet />
      </GalleryPage>
    )
  },
  loader: async ({ params }) => {
    const space = await resolveSpace(params.spaceKey)
    return galleryLoader({ params: { ...params, spaceID: space.id, spaceName: space.name } })
  },
  shouldReload: false,
})

// /spaces/$spaceKey/f/$galleryKey/$imageKey  →  image inside nested folder
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

// /spaces/$spaceKey/$imageKey/editor  →  image editor at the root of a space
const spaceImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: async ({ params }) => {
    const space = await resolveSpace(params.spaceKey)
    return imageEditorLoader({
      params: { ...params, galleryKey: '', spaceID: space.id, spaceName: space.name },
    })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceImageEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

// /spaces/$spaceKey/f/$galleryKey/$imageKey/editor  →  image editor inside a space folder
const spaceGalleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/f/$galleryKey/$imageKey/editor',
  beforeLoad: requireImageEditorAuth,
  loader: async ({ params }) => {
    const space = await resolveSpace(params.spaceKey)
    return imageEditorLoader({ params: { ...params, spaceID: space.id, spaceName: space.name } })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceGalleryImageEditorRoute.useLoaderData()
    const { galleryKey } = spaceGalleryImageEditorRoute.useParams()
    return <ImageEditorPage loaderData={loaderData} galleryKey={galleryKey} />
  },
})

// /spaces/$spaceKey/editor/new  →  new canvas editor inside a space
const spaceCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/editor/new',
  beforeLoad: requireImageEditorAuth,
  loader: async ({ location, params }) => {
    const space = await resolveSpace(params.spaceKey)
    return canvasEditorLoader({ search: location.searchStr, spaceID: space?.id })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceCanvasEditorRoute.useLoaderData()
    return <ImageEditorPage loaderData={loaderData} galleryKey='' />
  },
})

// /account/spaces/new  →  full-page create-space wizard (no sidebar)
const createSpaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account/spaces/new',
  beforeLoad: requireAdminAccountAuth,
  component: CreateSpacePage,
})

// ─── Space settings: layout route + per-section child routes ────────────────

// Layout: renders sidebar shell + <Outlet /> for section content
const spaceSettingsLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/spaces/$spaceKey/settings',
  beforeLoad: requireAccountAuth,
  loader: ({ params: { spaceKey } }) => spaceSettingsLoader({ params: { spaceKey } }),
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return <SpaceSettingsLayout space={space} />
  },
})

// Index: /spaces/$spaceKey/settings  →  redirect to /general
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

// /spaces/$spaceKey/settings/general
const generalSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/general',
  loader: async ({ params: { spaceKey } }) => {
    try {
      const space = await resolveSpace(spaceKey)
      const entries = await getSpaceRegistry(space.id)
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

// /spaces/$spaceKey/settings/storage  (BYOB only — component redirects non-BYOB)
const storageSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/storage',
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useLoaderData()
    return <StorageSection space={space} />
  },
})

// /spaces/$spaceKey/settings/imagor
const securitySectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/imagor',
  loader: async ({ params: { spaceKey } }) => {
    try {
      const space = await resolveSpace(spaceKey)
      const entries = await getSpaceRegistry(space.id)
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
    const initialValues = securitySectionRoute.useLoaderData()
    return <SecuritySection space={space} initialValues={initialValues} />
  },
})

// /spaces/$spaceKey/settings/gallery → redirect to general
const galleryRedirectRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/gallery',
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/spaces/$spaceKey/settings/general', params })
  },
})

// /spaces/$spaceKey/settings/members
const membersSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/members',
  loader: async ({ params }) => {
    try {
      const space = await resolveSpace(params.spaceKey)
      const [spaceMembers, invitations] = await Promise.all([
        listSpaceMembers(space.id),
        listSpaceInvitations(space.id),
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
        spaceID={space.id}
        initialMembers={spaceMembers}
        initialInvitations={invitations}
        isShared={space.isShared}
        canLeave={space.canLeave}
      />
    )
  },
})

// ─── Settings layout (no folder-tree sidebar) ────────────────────────────────

const settingsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'settings-layout',
  beforeLoad: requireAuth,
  component: () => <Outlet />,
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

const accountLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  id: 'account-layout',
  beforeLoad: requireAccountAuth,
  component: () => <AccountLayout />,
})

// ─── Admin: layout route + per-section child routes ─────────────────────────

const accountAdminLayoutRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/admin',
  beforeLoad: requireSelfHostedAdminAccountAuth,
  component: () => <AdminLayout />,
})

const accountAdminIndexRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/account/admin/general' })
  },
})

const accountAdminGeneralRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/general',
  loader: adminGeneralLoader,
  shouldReload: false,
  component: () => {
    const loaderData = accountAdminGeneralRoute.useLoaderData()
    return <AdminGeneralSection loaderData={loaderData} />
  },
})

const accountAdminStorageRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/storage',
  loader: adminStorageLoader,
  shouldReload: false,
  component: () => {
    const { storageStatus } = accountAdminStorageRoute.useLoaderData()
    return <AdminStorageSection storageStatus={storageStatus} />
  },
})

const accountAdminImagorRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/imagor',
  loader: adminImagorLoader,
  shouldReload: false,
  component: () => {
    const loaderData = accountAdminImagorRoute.useLoaderData()
    return <AdminImagorSection loaderData={loaderData} />
  },
})

const accountAdminLicenseRoute = createRoute({
  getParentRoute: () => accountAdminLayoutRoute,
  path: '/license',
  loader: adminLicenseLoader,
  shouldReload: false,
  component: () => {
    const { licenseStatus } = accountAdminLicenseRoute.useLoaderData()
    return <AdminLicenseSection licenseStatus={licenseStatus} />
  },
})

const accountUsersRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/users',
  beforeLoad: requireSelfHostedAdminAccountAuth,
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

// Check if embedded mode is enabled via environment variable
const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

// Embedded mode route - single root route with URL parameters
const embeddedEditorRoute = createRoute({
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

// Create different route trees based on embedded mode
const routeTree = isEmbeddedMode
  ? // Embedded mode: single root route with URL parameters
    rootRoute.addChildren([embeddedEditorRoute])
  : // Normal mode: full route tree
    rootRoute.addChildren([
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
        rootPath.addChildren([rootImagePage]),
        spaceSettingsLayoutRoute.addChildren([
          spaceSettingsIndexRoute,
          generalSectionRoute,
          storageSectionRoute,
          securitySectionRoute,
          galleryRedirectRoute,
          membersSectionRoute,
        ]),
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
          accountUsersRoute,
        ]),
      ]),
      baseLayoutRoute.addChildren([galleryRoute.addChildren([imagePage])]),
      spaceBaseLayoutRoute.addChildren([
        spaceRootRoute.addChildren([spaceRootImagePage]),
        spaceGalleryRoute.addChildren([spaceImagePage]),
      ]),
    ])

const createAppRouter = () => createRouter({ routeTree })

const localThemeStorage = new LocalConfigStorage('theme')
const localSidebarStorage = new LocalConfigStorage('sidebar_state')
const userThemeStorage = new UserRegistryConfigStorage('theme', localThemeStorage)
const userSidebarStorage = new UserRegistryConfigStorage('sidebar_state', localSidebarStorage)

initializeTheme(localThemeStorage, 'class')
initializeSidebar(localSidebarStorage)
initializeScrollPositions(new SessionConfigStorage('scroll_positions'))
initializeFolderTreeCache(new SessionConfigStorage('folder_tree'))
initAuth()
checkLicense()

export function AppRouter() {
  const router = useMemo(() => createAppRouter(), [])

  useAuthEffect((authState, action) => {
    if (action.type === 'INIT') {
      if (authState.state === 'authenticated') {
        initializeTheme(userThemeStorage, 'class')
        initializeSidebar(userSidebarStorage)
      }
    } else if (action.type === 'LOGOUT') {
      initializeTheme(localThemeStorage, 'class')
      initializeSidebar(localSidebarStorage)
    }
  })
  return <RouterProvider router={router} />
}
