import { PropsWithChildren, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Settings, Users } from 'lucide-react'

import { AppHeader } from '@/components/app-header.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarWrapper,
} from '@/components/ui/sidebar'
import { useBrand } from '@/hooks/use-brand'
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useAuth } from '@/stores/auth-store'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NavItem {
  id: string
  path: string
  icon: React.ReactNode
  label: string
  adminOnly?: boolean
  multiTenantOnly?: boolean
}

const NAV_GROUPS = (
  t: (key: string) => string,
): Array<{ heading: string; adminOnly?: boolean; selfHostedOnly?: boolean; items: NavItem[] }> => [
  {
    heading: t('layouts.account.sections.administration'),
    adminOnly: true,
    selfHostedOnly: true,
    items: [
      {
        id: 'admin',
        path: '/account/admin',
        icon: <Settings className='h-4 w-4' />,
        label: t('layouts.account.tabs.system'),
        adminOnly: true,
      },
      {
        id: 'users',
        path: '/account/users',
        icon: <Users className='h-4 w-4' />,
        label: t('layouts.account.tabs.users'),
        adminOnly: true,
      },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function AccountLayout({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()
  const isAdmin = authState.profile?.role === 'admin'
  const isMultiTenant = authState.multiTenant

  useScrollHandler(location.pathname)

  useEffect(() => {
    requestAnimationFrame(() => restoreScrollPosition(location.pathname))
  }, [location.pathname])

  const groups = NAV_GROUPS(t)
  const visibleGroups = groups
    .filter((g) => (!g.adminOnly || isAdmin) && (!g.selfHostedOnly || !isMultiTenant))
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) => (!item.adminOnly || isAdmin) && (!item.multiTenantOnly || isMultiTenant),
      ),
    }))
    .filter((g) => g.items.length > 0)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <SidebarWrapper>
      {/* ── Settings sidebar ─────────────────────────────────────────── */}
      <Sidebar collapsible='offcanvas' className='top-14'>
        <SidebarContent>
          {visibleGroups.map((group, gi) => (
            <SidebarGroup key={gi}>
              <SidebarGroupLabel>{group.heading}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.path)}
                        tooltip={item.label}
                        className='data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground'
                      >
                        <Link to={item.path}>
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <SidebarInset>
        <AppHeader
          profileLabel={getUserDisplayName()}
          roleLabel={authState.profile?.role}
          onLogout={handleLogout}
          profileText={t('layouts.account.tabs.profile')}
          signOutText={t('common.navigation.signOut')}
          moreText={t('common.buttons.more')}
          leftSlot={
            <div className='flex min-w-0 items-center gap-1'>
              <SidebarTrigger className='h-9 w-9 shrink-0 [&_svg]:size-5' />
              <BreadcrumbLink asChild>
                <Link to='/' className='shrink-0 text-xl font-bold'>
                  {appTitle}
                </Link>
              </BreadcrumbLink>
              <div className='hidden min-w-0 sm:flex sm:items-center'>
                <span className='text-border mx-2 shrink-0 select-none'>|</span>
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage>{t('layouts.account.title')}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>
          }
          mobileTitle={
            <div className='flex min-w-0 items-center gap-1'>
              <SidebarTrigger className='h-9 w-9 shrink-0 [&_svg]:size-5' />
              <BreadcrumbLink asChild>
                <Link to='/' className='shrink-0 text-xl font-bold'>
                  {appTitle}
                </Link>
              </BreadcrumbLink>
              <div className='flex min-w-0 items-center'>
                <span className='text-border mx-2 shrink-0 select-none'>|</span>
                <span className='min-w-0 truncate text-sm font-medium'>
                  {t('layouts.account.title')}
                </span>
              </div>
            </div>
          }
        />

        {/* Content area — pt-14 clears the fixed header */}
        <main className='relative min-h-screen pt-14'>
          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
            {children || <Outlet />}
          </div>
        </main>
      </SidebarInset>
    </SidebarWrapper>
  )
}
