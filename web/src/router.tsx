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

import { getMyOrganization } from '@/api/org-api'
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
  billingLoader,
  orgMembersLoader,
  profileLoader,
  resolveSpaceSettingsRouteContext,
  usersLoader,
} from '@/loaders/account-loader.ts'
import { adminSetupLoader } from '@/loaders/admin-setup-loader.ts'
import { authCallbackLoader } from '@/loaders/auth-callback-loader.ts'
import {
  redirectAuthenticatedUsersWithOrganization,
  requireAccountAuth,
  requireAuth,
  requireImageEditorAuth,
  requireOrganizationAccountAuth,
  requireOrganizationAdminAccountAuth,
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
import {
  spaceGeneralSectionLoader,
  spaceMembersSectionLoader,
  spaceSecuritySectionLoader,
} from '@/loaders/space-settings-loader'
import { AccountBillingRoutePage } from '@/pages/account-billing-route-page'
import { AccountMembersRoutePage } from '@/pages/account-members-route-page'
import { AccountOrganizationLayout } from '@/pages/account-organization-layout'
import { AccountProfileRoutePage } from '@/pages/account-profile-route-page'
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
import { PrivacyPage, TermsPage } from '@/pages/legal-page.tsx'
import { LoginPage } from '@/pages/login-page.tsx'
import { RegisterPage } from '@/pages/register-page.tsx'
import { RegisterVerifyPage } from '@/pages/register-verify-page.tsx'
import { RootPage } from '@/pages/root-page'
import { GeneralSection } from '@/pages/space-settings/general'
import { SpaceSettingsLayout } from '@/pages/space-settings/layout'
import { MembersSection } from '@/pages/space-settings/members'
import { SecuritySection } from '@/pages/space-settings/security'
import { StorageSection } from '@/pages/space-settings/storage'
import { UsersPage } from '@/pages/users-page'
import { WorkspaceRequiredPage } from '@/pages/workspace-required-page'
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

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
})

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
})

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
})

const registerVerifyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register/verify',
  component: RegisterVerifyPage,
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
  beforeLoad: async (context) => {
    await requireAuth(context)
    return { space: await resolveSpace(context.params.spaceKey) }
  },
  component: () => {
    const { space } = spaceBaseLayoutRoute.useRouteContext()
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
  // In multi-tenant mode, render the spaces list at the base path (no sidebar).
  // In self-hosted mode, render the root gallery wrapped in SidebarLayout.
  beforeLoad: async (context) => {
    const auth = getAuth()
    if (auth.multiTenant) {
      return requireOrganizationAccountAuth(context)
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
    const { space } = spaceBaseLayoutRoute.useRouteContext()
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
  loader: ({ params, context }) => {
    const { space } = context
    return galleryLoader({
      params: {
        galleryKey: '',
        routeSpaceKey: params.spaceKey,
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
  loader: ({ params, context }) => {
    const { space } = context
    return imageLoader({
      params: { ...params, galleryKey: '', spaceID: space.id },
    })
  },
  component: () => {
    const galleryLoaderData = spaceRootRoute.useLoaderData()
    const imageLoaderData = spaceRootImagePage.useLoaderData()
    const { space } = spaceBaseLayoutRoute.useRouteContext()
    const { imageKey } = spaceRootImagePage.useParams()
    return (
      <ImagePage
        imageLoaderData={imageLoaderData}
        galleryLoaderData={galleryLoaderData}
        galleryKey=''
        imageKey={imageKey}
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
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
    const { space } = spaceBaseLayoutRoute.useRouteContext()
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
  loader: ({ params, context }) => {
    const { space } = context
    return galleryLoader({
      params: {
        galleryKey: params.galleryKey,
        routeSpaceKey: params.spaceKey,
        spaceID: space.id,
        spaceName: space.name,
      },
    })
  },
  shouldReload: false,
})

// /spaces/$spaceKey/f/$galleryKey/$imageKey  →  image inside nested folder
const spaceImagePage = createRoute({
  getParentRoute: () => spaceGalleryRoute,
  path: '/$imageKey',
  loader: ({ params, context }) => {
    const { space } = context
    return imageLoader({ params: { ...params, spaceID: space.id } })
  },
  component: () => {
    const galleryLoaderData = spaceGalleryRoute.useLoaderData()
    const imageLoaderData = spaceImagePage.useLoaderData()
    const { space } = spaceBaseLayoutRoute.useRouteContext()
    const { galleryKey, imageKey } = spaceImagePage.useParams()
    return (
      <ImagePage
        imageLoaderData={imageLoaderData}
        galleryLoaderData={galleryLoaderData}
        galleryKey={galleryKey}
        imageKey={imageKey}
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      />
    )
  },
})

// /spaces/$spaceKey/$imageKey/editor  →  image editor at the root of a space
const spaceImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/$imageKey/editor',
  beforeLoad: async (context) => {
    await requireImageEditorAuth(context)
    return { space: await resolveSpace(context.params.spaceKey) }
  },
  loader: ({ params, context }) => {
    const { space } = context
    return imageEditorLoader({
      params: { ...params, galleryKey: '', spaceID: space.id, spaceName: space.name },
    })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceImageEditorRoute.useLoaderData()
    const { space } = spaceImageEditorRoute.useRouteContext()
    return (
      <ImageEditorPage
        loaderData={loaderData}
        galleryKey=''
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      />
    )
  },
})

// /spaces/$spaceKey/f/$galleryKey/$imageKey/editor  →  image editor inside a space folder
const spaceGalleryImageEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/f/$galleryKey/$imageKey/editor',
  beforeLoad: async (context) => {
    await requireImageEditorAuth(context)
    return { space: await resolveSpace(context.params.spaceKey) }
  },
  loader: ({ params, context }) => {
    const { space } = context
    return imageEditorLoader({ params: { ...params, spaceID: space.id, spaceName: space.name } })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceGalleryImageEditorRoute.useLoaderData()
    const { space } = spaceGalleryImageEditorRoute.useRouteContext()
    const { galleryKey } = spaceGalleryImageEditorRoute.useParams()
    return (
      <ImageEditorPage
        loaderData={loaderData}
        galleryKey={galleryKey}
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      />
    )
  },
})

// /spaces/$spaceKey/editor/new  →  new canvas editor inside a space
const spaceCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/editor/new',
  beforeLoad: async (context) => {
    await requireImageEditorAuth(context)
    return { space: await resolveSpace(context.params.spaceKey) }
  },
  loader: ({ location, context }) => {
    const { space } = context
    return canvasEditorLoader({ search: location.searchStr, spaceID: space?.id })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceCanvasEditorRoute.useLoaderData()
    const { space } = spaceCanvasEditorRoute.useRouteContext()
    return (
      <ImageEditorPage
        loaderData={loaderData}
        galleryKey=''
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      />
    )
  },
})

// /spaces/$spaceKey/f/$galleryKey/editor/new  →  new canvas editor inside a space folder
const spaceGalleryCanvasEditorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/spaces/$spaceKey/f/$galleryKey/editor/new',
  beforeLoad: async (context) => {
    await requireImageEditorAuth(context)
    return { space: await resolveSpace(context.params.spaceKey) }
  },
  loader: ({ location, context }) => {
    const { space } = context
    return canvasEditorLoader({ search: location.searchStr, spaceID: space?.id })
  },
  shouldReload: false,
  component: () => {
    const loaderData = spaceGalleryCanvasEditorRoute.useLoaderData()
    const { space } = spaceGalleryCanvasEditorRoute.useRouteContext()
    const { galleryKey } = spaceGalleryCanvasEditorRoute.useParams()
    return (
      <ImageEditorPage
        loaderData={loaderData}
        galleryKey={galleryKey}
        space={{ spaceKey: space.key, spaceID: space.id, spaceName: space.name }}
      />
    )
  },
})

// /account/spaces/new  →  full-page create-space wizard (no sidebar)
const createSpaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account/spaces/new',
  beforeLoad: requireOrganizationAdminAccountAuth,
  component: CreateSpacePage,
})

// ─── Space settings: layout route + per-section child routes ────────────────

// Layout: renders sidebar shell + <Outlet /> for section content
const spaceSettingsLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/spaces/$spaceKey/settings',
  beforeLoad: async (context) => {
    await requireAccountAuth(context)
    return resolveSpaceSettingsRouteContext({ params: { routeSpaceKey: context.params.spaceKey } })
  },
  loader: ({ context }) => ({ breadcrumb: context.breadcrumb }),
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useRouteContext()
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
  loader: spaceGeneralSectionLoader,
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useRouteContext()
    const { registry } = generalSectionRoute.useLoaderData()
    return <GeneralSection space={space} initialValues={registry} />
  },
})

// /spaces/$spaceKey/settings/storage  (BYOB only — component redirects non-BYOB)
const storageSectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/storage',
  loader: async () => ({ breadcrumb: { translationKey: 'pages.spaceSettings.sections.storage' } }),
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useRouteContext()
    return <StorageSection space={space} />
  },
})

// /spaces/$spaceKey/settings/imagor
const securitySectionRoute = createRoute({
  getParentRoute: () => spaceSettingsLayoutRoute,
  path: '/imagor',
  loader: spaceSecuritySectionLoader,
  shouldReload: false,
  component: () => {
    const { space } = spaceSettingsLayoutRoute.useRouteContext()
    const { registry } = securitySectionRoute.useLoaderData()
    return <SecuritySection space={space} initialValues={registry} />
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
  loader: spaceMembersSectionLoader,
  shouldReload: false,
  component: () => {
    const { spaceMembers, invitations } = membersSectionRoute.useLoaderData()
    const { space } = spaceSettingsLayoutRoute.useRouteContext()
    return (
      <MembersSection
        spaceID={space.id}
        initialMembers={spaceMembers}
        initialInvitations={invitations}
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

const workspaceRequiredRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/account/workspace-required',
  beforeLoad: redirectAuthenticatedUsersWithOrganization,
  component: WorkspaceRequiredPage,
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
    return <AccountProfileRoutePage loaderData={loaderData} />
  },
})

const accountLegacyBillingRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/billing',
  beforeLoad: () => {
    throw redirect({ to: '/account/organization/billing' })
  },
})

const accountLegacyMembersRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/members',
  beforeLoad: () => {
    throw redirect({ to: '/account/organization/members' })
  },
})

const accountOrganizationLayoutRoute = createRoute({
  getParentRoute: () => accountLayoutRoute,
  path: '/account/organization',
  beforeLoad: requireOrganizationAccountAuth,
  loader: async () => getMyOrganization(),
  component: () => {
    const organization = accountOrganizationLayoutRoute.useLoaderData()
    return <AccountOrganizationLayout currentUserRole={organization?.currentUserRole ?? null} />
  },
})

const accountOrganizationIndexRoute = createRoute({
  getParentRoute: () => accountOrganizationLayoutRoute,
  path: '/',
  beforeLoad: async (context) => {
    await requireOrganizationAccountAuth(context)
    const organization = await getMyOrganization()
    throw redirect({
      to:
        organization?.currentUserRole === 'owner' || organization?.currentUserRole === 'admin'
          ? '/account/organization/billing'
          : '/account/organization/members',
    })
  },
})

const accountOrganizationOverviewRoute = createRoute({
  getParentRoute: () => accountOrganizationLayoutRoute,
  path: '/overview',
  beforeLoad: () => {
    throw redirect({ to: '/account/organization/billing' })
  },
})

const accountOrganizationBillingRoute = createRoute({
  getParentRoute: () => accountOrganizationLayoutRoute,
  path: '/billing',
  beforeLoad: requireOrganizationAdminAccountAuth,
  loader: billingLoader,
  component: () => {
    const loaderData = accountOrganizationBillingRoute.useLoaderData()
    return <AccountBillingRoutePage loaderData={loaderData} />
  },
})

const accountOrganizationMembersRoute = createRoute({
  getParentRoute: () => accountOrganizationLayoutRoute,
  path: '/members',
  loader: orgMembersLoader,
  component: () => {
    const loaderData = accountOrganizationMembersRoute.useLoaderData()
    return <AccountMembersRoutePage loaderData={loaderData} />
  },
})

const accountLayoutRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  id: 'account-layout',
  beforeLoad: requireOrganizationAccountAuth,
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
const isMultiTenantMode = import.meta.env.VITE_MULTI_TENANT === 'true'

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
      ...(isMultiTenantMode ? [privacyRoute, termsRoute] : []),
      loginRoute,
      registerRoute,
      registerVerifyRoute,
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
      spaceGalleryCanvasEditorRoute,
      settingsLayoutRoute.addChildren([
        workspaceRequiredRoute,
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
          accountLegacyBillingRoute,
          accountLegacyMembersRoute,
          accountOrganizationLayoutRoute.addChildren([
            accountOrganizationIndexRoute,
            accountOrganizationOverviewRoute,
            accountOrganizationBillingRoute,
            accountOrganizationMembersRoute,
          ]),
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
