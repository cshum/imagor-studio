import { useTranslation } from 'react-i18next'

import type { ProfileLoaderData } from '@/loaders/account-loader'
import { ProfilePage } from '@/pages/profile-page'

interface AccountProfileRoutePageProps {
  loaderData: ProfileLoaderData
}

export function AccountProfileRoutePage({ loaderData }: AccountProfileRoutePageProps) {
  const { t } = useTranslation()

  return (
    <>
      <div className='mb-8'>
        <h1 className='text-2xl font-semibold tracking-tight'>{t('pages.profile.title')}</h1>
        <p className='text-muted-foreground mt-1 text-sm'>{t('pages.profile.titleDescription')}</p>
      </div>
      <ProfilePage loaderData={loaderData} />
    </>
  )
}
