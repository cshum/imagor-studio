import { useTranslation } from 'react-i18next'
import { Link, Outlet } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SidebarLayout } from '@/layouts/sidebar-layout'
import { SpacesLayout } from '@/layouts/spaces-layout'
import { spacesLoader } from '@/loaders/account-loader'
import { galleryLoader } from '@/loaders/gallery-loader'
import { GalleryPage } from '@/pages/gallery-page'
import { SpacesPage } from '@/pages/spaces-page'

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

function SpacesPageActions({ createSpaceDisabled }: { createSpaceDisabled: boolean }) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <CreateSpacePageTrigger disabled={createSpaceDisabled} />
    </div>
  )
}

// ── Page component ─────────────────────────────────────────────────────────────

interface RootPageProps {
  spacesData?: Awaited<ReturnType<typeof spacesLoader>>
  galleryLoaderData?: Awaited<ReturnType<typeof galleryLoader>> | null
}

export function RootPage({ spacesData, galleryLoaderData }: RootPageProps) {
  const { t } = useTranslation()

  if (spacesData) {
    const isOrgAdmin =
      spacesData.currentOrganizationRole === 'owner' || spacesData.currentOrganizationRole === 'admin'
    const createSpaceDisabled =
      spacesData.usageSummary.maxSpaces !== null &&
      spacesData.usageSummary.usedSpaces >= spacesData.usageSummary.maxSpaces

    return (
      <SpacesLayout
        title={t('pages.spaces.title')}
        description={t('pages.spaces.description')}
        showOrganizationLink={spacesData.currentOrganizationId !== null}
        primaryAction={
          isOrgAdmin ? <SpacesPageActions createSpaceDisabled={createSpaceDisabled} /> : undefined
        }
      >
        <SpacesPage
          loaderData={spacesData.spaces}
          usageSummary={spacesData.usageSummary}
          currentOrganizationId={spacesData.currentOrganizationId}
          currentOrganizationPlan={spacesData.currentOrganizationPlan}
          currentOrganizationPlanStatus={spacesData.currentOrganizationPlanStatus}
          canCreateSpace={isOrgAdmin}
          canManageOrganization={isOrgAdmin}
        />
      </SpacesLayout>
    )
  }

  if (!galleryLoaderData) {
    throw new Error('RootPage requires gallery loader data for the self-hosted surface')
  }

  return (
    <SidebarLayout>
      <GalleryPage galleryLoaderData={galleryLoaderData} galleryKey=''>
        <Outlet />
      </GalleryPage>
    </SidebarLayout>
  )
}
