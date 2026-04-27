import { useTranslation } from 'react-i18next'
import { Link, Outlet } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
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

function SpacesPageActions({
  createSpaceDisabled,
}: {
  createSpaceDisabled: boolean
}) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <CreateSpacePageTrigger disabled={createSpaceDisabled} />
    </div>
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
    const createSpaceDisabled =
      data.usageSummary.maxSpaces !== null &&
      data.usageSummary.usedSpaces >= data.usageSummary.maxSpaces

    return (
      <SpacesLayout
        title={t('pages.spaces.title')}
        description={t('pages.spaces.description')}
        primaryAction={
          <SpacesPageActions createSpaceDisabled={createSpaceDisabled} />
        }
      >
        <SpacesPage
          loaderData={data.spaces}
          usageSummary={data.usageSummary}
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
