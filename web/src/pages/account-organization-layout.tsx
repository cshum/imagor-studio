import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation } from '@tanstack/react-router'

import { useAuth } from '@/stores/auth-store'

const ORGANIZATION_TABS = [
  {
    id: 'billing',
    path: '/account/organization/billing',
    labelKey: 'layouts.account.tabs.billing',
  },
  {
    id: 'members',
    path: '/account/organization/members',
    labelKey: 'navigation.breadcrumbs.organizationMembers',
  },
] as const

export function AccountOrganizationLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const { authState } = useAuth()
  const visibleTabs = ORGANIZATION_TABS.filter(
    (tab) => tab.id !== 'billing' || authState.profile?.role === 'admin',
  )

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className='space-y-6'>
      <div className='border-b'>
        <div className='flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {visibleTabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={[
                '-mb-px flex shrink-0 items-center border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap',
                isActive(tab.path)
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              ].join(' ')}
            >
              {t(tab.labelKey)}
            </Link>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  )
}
