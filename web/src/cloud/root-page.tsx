import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SpacesLayout } from '@/layouts/spaces-layout'
import { spacesLoader } from '@/cloud/account-loader'
import { cloudRootPageLoader } from '@/cloud/root-page-loader'
import { SpacesPage } from '@/pages/spaces-page'

function CreateSpacePageTrigger() {
	const { t } = useTranslation()
	return (
		<Link to='/account/spaces/new'>
			<Button>
				<Plus className='mr-2 h-4 w-4' />
				{t('pages.spaces.createSpace')}
			</Button>
		</Link>
	)
}

interface CloudRootPageProps {
	loaderData: Awaited<ReturnType<typeof cloudRootPageLoader>>
}

export function CloudRootPage({ loaderData }: CloudRootPageProps) {
	const { t } = useTranslation()
	const data = loaderData as Awaited<ReturnType<typeof spacesLoader>>

	return (
		<SpacesLayout
			title={t('pages.spaces.title')}
			description={t('pages.spaces.description')}
			primaryAction={<CreateSpacePageTrigger />}
		>
			<SpacesPage loaderData={data.spaces} currentOrganizationId={data.currentOrganizationId} />
		</SpacesLayout>
	)
}
