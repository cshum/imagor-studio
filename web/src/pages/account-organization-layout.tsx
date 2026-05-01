import { useTranslation } from 'react-i18next'
import { Link, Outlet, useMatches, useRouterState } from '@tanstack/react-router'

interface AccountOrganizationLayoutProps {
  currentUserRole?: string | null
}

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

export function AccountOrganizationLayout({ currentUserRole }: AccountOrganizationLayoutProps) {
  const { t } = useTranslation()
  const matches = useMatches()
  const { location } = useRouterState()
  const visibleTabs = ORGANIZATION_TABS.filter(
    (tab) => tab.id !== 'billing' || currentUserRole === 'owner' || currentUserRole === 'admin',
  )

  const activePathname = (matches[matches.length - 1] as { pathname?: string } | undefined)
    ?.pathname
    ? String((matches[matches.length - 1] as { pathname?: string }).pathname)
    : location.pathname

  const isActive = (path: string) =>
    activePathname === path || activePathname.startsWith(path + '/')

  return (
    <div className='space-y-6'>
      <div className='border-b'>
        <div className='flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {visibleTabs.map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              className={[
                'flex shrink-0 items-center border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap',
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
