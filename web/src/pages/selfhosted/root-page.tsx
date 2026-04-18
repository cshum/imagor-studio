import { Outlet } from '@tanstack/react-router'

import { SidebarLayout } from '@/layouts/sidebar-layout'
import { galleryLoader } from '@/loaders/gallery-loader'
import { selfHostedRootPageLoader } from '@/loaders/selfhosted/root-page-loader'
import { GalleryPage } from '@/pages/gallery-page'

interface SelfHostedRootPageProps {
	loaderData: Awaited<ReturnType<typeof selfHostedRootPageLoader>>
}

export function SelfHostedRootPage({ loaderData }: SelfHostedRootPageProps) {
	const galleryLoaderData = loaderData as Awaited<ReturnType<typeof galleryLoader>>
	return (
		<SidebarLayout>
			<GalleryPage galleryLoaderData={galleryLoaderData} galleryKey=''>
				<Outlet />
			</GalleryPage>
		</SidebarLayout>
	)
}