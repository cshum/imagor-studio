import { useTranslation } from 'react-i18next'
import { Link, Outlet } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getPlanEntitlements } from '@/lib/plan-entitlements'
import { SidebarLayout } from '@/layouts/sidebar-layout'
import { SpacesLayout } from '@/layouts/spaces-layout'
import { spacesLoader } from '@/loaders/account-loader'
import { galleryLoader } from '@/loaders/gallery-loader'
import { rootPageLoader } from '@/loaders/root-page-loader'
import { GalleryPage } from '@/pages/gallery-page'
import { SpacesPage } from '@/pages/spaces-page'
import { getAuth } from '@/stores/auth-store'

// ── Create-space trigger (used in the spaces list header) ─────────────────────

function CreateSpacePageTrigger({ disabled }: { disabled: boolean }) {
  const { t } = useTranslation()

  if (disabled) {
    return (
      <Button disabled title={t('pages.spaces.messages.spaceLimitReached')}>
        <Plus className='mr-2 h-4 w-4' />
        {t('pages.spaces.createSpace')}
      </Button>
    )
  }

  return (
    <Link to='/account/spaces/new'>
      <Button>
        <Plus className='mr-2 h-4 w-4' />
        {t('pages.spaces.createSpace')}
      </Button>
    </Link>
  )
}

// ── Page component ─────────────────────────────────────────────────────────────

interface RootPageProps {
  loaderData: Awaited<ReturnType<typeof rootPageLoader>>
}

export function RootPage({ loaderData }: RootPageProps) {
  const { t } = useTranslation()
  const auth = getAuth()

  if (auth.multiTenant) {
    const data = loaderData as Awaited<ReturnType<typeof spacesLoader>>
    const entitlements = getPlanEntitlements(data.currentOrganizationPlan)
    const ownedSpaces = data.spaces.filter((space) => space.orgId === data.currentOrganizationId)
    const createSpaceDisabled =
      entitlements.maxSpaces >= 0 && ownedSpaces.length >= entitlements.maxSpaces

    return (
      <SpacesLayout
        title={t('pages.spaces.title')}
        description={t('pages.spaces.description')}
        primaryAction={<CreateSpacePageTrigger disabled={createSpaceDisabled} />}
      >
        <SpacesPage
          loaderData={data.spaces}
          currentOrganizationId={data.currentOrganizationId}
          currentOrganizationPlan={data.currentOrganizationPlan}
          currentOrganizationPlanStatus={data.currentOrganizationPlanStatus}
        />
      </SpacesLayout>
    )
  }

  const galleryLoaderData = loaderData as Awaited<ReturnType<typeof galleryLoader>>
  return (
    <SidebarLayout>
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey=''>
        <Outlet />
      </GalleryPage>
    </SidebarLayout>
  )
}
