import { PropsWithChildren, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { LayoutGrid, LogOut, MoreVertical, Settings, User, Users } from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle.tsx'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { restoreScrollPosition, useScrollHandler } from '@/hooks/use-scroll-handler'
import { useBrand } from '@/hooks/use-brand'
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
): Array<{ heading: string; adminOnly?: boolean; items: NavItem[] }> => [
  {
    heading: t('layouts.account.sections.account'),
    items: [
      {
        id: 'profile',
        path: '/account/profile',
        icon: <User className='h-4 w-4' />,
        label: t('layouts.account.tabs.profile'),
      },
    ],
  },
  {
    heading: t('layouts.account.sections.administration'),
    adminOnly: true,
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
      {
        id: 'spaces',
        path: '/account/spaces',
        icon: <LayoutGrid className='h-4 w-4' />,
        label: t('layouts.account.tabs.spaces'),
        adminOnly: true,
        multiTenantOnly: true,
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
    .filter((g) => !g.adminOnly || isAdmin)
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (item) =>
          (!item.adminOnly || isAdmin) && (!item.multiTenantOnly || isMultiTenant),
      ),
    }))
    .filter((g) => g.items.length > 0)

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const getUserDisplayName = () =>
    authState.profile?.displayName ||
    authState.profile?.username ||
    t('common.status.user')

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
        {/* Fixed full-width header — same pattern as gallery HeaderBar */}
        <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
          <div className='mx-auto px-4 py-2'>
            <div className='flex h-10 items-center justify-between'>
              {/* Left: sidebar toggle + app title + separator + section title */}
              <div className='flex items-center space-x-1 sm:space-x-2'>
                <SidebarTrigger className='-ml-2 h-10 w-10' />
                <Link
                  to='/'
                  className='hidden text-base font-semibold transition-opacity hover:opacity-80 sm:block'
                >
                  {appTitle}
                </Link>
                <span className='text-muted-foreground mx-2 hidden sm:block'>|</span>
                <span className='text-muted-foreground hidden text-sm sm:block'>
                  {t('layouts.account.title')}
                </span>
              </div>

              {/* Right: mode toggle + user menu */}
              <div className='flex items-center space-x-1'>
                <ModeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-10 w-10'>
                      <MoreVertical className='h-4 w-4' />
                      <span className='sr-only'>{t('common.buttons.more')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-56'>
                    <DropdownMenuLabel className='font-normal'>
                      <div className='flex flex-col space-y-1'>
                        <p className='text-sm font-medium leading-none'>{getUserDisplayName()}</p>
                        {authState.profile?.role && (
                          <p className='text-muted-foreground text-xs leading-none capitalize'>
                            {authState.profile.role}
                          </p>
                        )}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem asChild>
                      <Link to='/'>
                        <LayoutGrid className='text-muted-foreground mr-3 h-4 w-4' />
                        {t('layouts.account.backToApp')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className='cursor-pointer'>
                      <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                      {t('common.navigation.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

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
