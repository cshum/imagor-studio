import { useTranslation } from 'react-i18next'
import { UserRound, Users } from 'lucide-react'

import { AccountLayoutShell, type AccountNavGroup } from '@/layouts/account-layout-shell'

export function CloudAccountLayout() {
  const { t } = useTranslation()

  const groups: AccountNavGroup[] = [
    {
      heading: t('layouts.account.sections.account'),
      items: [
        {
          id: 'profile',
          path: '/account/profile',
          icon: <UserRound className='h-4 w-4' />,
          label: t('layouts.account.tabs.profile'),
        },
        {
          id: 'users',
          path: '/account/users',
          icon: <Users className='h-4 w-4' />,
          label: t('layouts.account.tabs.users'),
        },
      ],
    },
  ]

  return (
    <AccountLayoutShell
      title={t('layouts.account.title')}
      showSidebar={false}
      groups={groups}
      backLabel={t('pages.spaceSettings.openGallery')}
    />
  )
}
