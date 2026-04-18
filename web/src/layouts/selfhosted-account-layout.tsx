import { useTranslation } from 'react-i18next'
import { Cpu, HardDrive, KeyRound, LayoutDashboard, UserRound } from 'lucide-react'

import { AccountLayoutShell, type AccountNavGroup } from '@/layouts/account-layout-shell'

export function SelfHostedAccountLayout() {
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
      ],
    },
    {
      heading: t('layouts.account.sections.administration'),
      items: [
        {
          id: 'admin-general',
          path: '/account/admin/general',
          icon: <LayoutDashboard className='h-4 w-4' />,
          label: t('pages.admin.sections.general'),
        },
        {
          id: 'admin-storage',
          path: '/account/admin/storage',
          icon: <HardDrive className='h-4 w-4' />,
          label: t('pages.admin.sections.storage'),
        },
        {
          id: 'admin-imagor',
          path: '/account/admin/imagor',
          icon: <Cpu className='h-4 w-4' />,
          label: t('pages.admin.sections.imagor'),
        },
        {
          id: 'admin-license',
          path: '/account/admin/license',
          icon: <KeyRound className='h-4 w-4' />,
          label: t('pages.admin.sections.license'),
        },
      ],
    },
  ]

  return (
    <AccountLayoutShell
      title={t('layouts.account.title')}
      showSidebar={true}
      groups={groups}
      backLabel={t('pages.spaceSettings.openGallery')}
    />
  )
}
