import { useTranslation } from 'react-i18next'
import { useLoaderData } from '@tanstack/react-router'

import type { ProfileLoaderData } from '@/loaders/account-loader'
import { ProfilePage } from '@/pages/profile-page'

export function AccountProfileRoutePage() {
  const { t } = useTranslation()
  const loaderData = useLoaderData({ from: '/account/profile' }) as ProfileLoaderData

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
