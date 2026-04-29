import { PropsWithChildren, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  Cpu,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  PanelLeft,
  UserRound,
  Users,
} from 'lucide-react'

import { AppHeader } from '@/components/app-header.tsx'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarWrapper,
} from '@/components/ui/sidebar'
import { useBrand } from '@/hooks/use-brand'
import { useBreadcrumb } from '@/hooks/use-breadcrumb'
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
    adminOnly: true,
    selfHostedOnly: true,
    items: [
      {
        id: 'admin-general',
        path: '/account/admin/general',
        icon: <LayoutDashboard className='h-4 w-4' />,
        label: t('pages.admin.sections.general'),
        adminOnly: true,
      },
      {
        id: 'admin-storage',
        path: '/account/admin/storage',
        icon: <HardDrive className='h-4 w-4' />,
        label: t('pages.admin.sections.storage'),
        adminOnly: true,
      },
      {
        id: 'admin-imagor',
        path: '/account/admin/imagor',
        icon: <Cpu className='h-4 w-4' />,
        label: t('pages.admin.sections.imagor'),
        adminOnly: true,
      },
      {
        id: 'admin-license',
        path: '/account/admin/license',
        icon: <KeyRound className='h-4 w-4' />,
        label: t('pages.admin.sections.license'),
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

export function AccountLayout({
  children,
  showOrganizationLink = false,
}: PropsWithChildren<{ showOrganizationLink?: boolean }>) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()
  const breadcrumbs = useBreadcrumb()
  const isAdmin = authState.profile?.role === 'admin'
  const isMultiTenant = authState.multiTenant
  const showSidebar = !isMultiTenant
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountLinks =
    isMultiTenant && showOrganizationLink
      ? [
          {
            label: t('navigation.breadcrumbs.organization'),
            href: '/account/organization',
            icon: <Building2 className='text-muted-foreground mr-3 h-4 w-4' />,
          },
        ]
      : []

  useScrollHandler(location.pathname)

  useEffect(() => {
    requestAnimationFrame(() => restoreScrollPosition(location.pathname))
  }, [location.pathname])

  // Close mobile sheet on navigation
  useEffect(() => {
    setMobileOpen(false)
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

  // ── Shared nav content (rendered in both desktop sidebar & mobile Sheet) ──

  const navContent = (
    <>
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
      <SidebarFooter className='border-t py-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to='/'>
                <ArrowLeft className='h-4 w-4' />
                <span>{t('pages.spaceSettings.openGallery')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )

  // ── Shared trigger button (tablet + mobile) ───────────────────────────────

  const triggerButton = showSidebar ? (
    <Button
      variant='ghost'
      size='icon'
      className='-my-0.5 -ml-2 h-11 w-11 shrink-0 lg:hidden [&_svg]:size-5'
      onClick={() => setMobileOpen(true)}
      aria-label={t('layouts.account.title')}
    >
      <PanelLeft />
    </Button>
  ) : null

  return (
    <SidebarWrapper>
      {/* ── Desktop sidebar — self-hosted only ──────────────────────────────── */}
      {showSidebar && (
        <Sidebar
          collapsible='none'
          className='fixed top-14 bottom-0 left-0 z-10 hidden h-auto border-r lg:flex'
        >
          {navContent}
        </Sidebar>
      )}

      {/* ── Mobile / tablet sidebar sheet — self-hosted only ────────────────── */}
      {showSidebar && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side='left'
            className='bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden'
            style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
          >
            <SheetHeader className='sr-only'>
              <SheetTitle>{t('layouts.account.title')}</SheetTitle>
              <SheetDescription>{t('layouts.account.title')}</SheetDescription>
            </SheetHeader>
            <div className='flex h-full flex-col'>{navContent}</div>
          </SheetContent>
        </Sheet>
      )}

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <SidebarInset className={showSidebar ? 'lg:pl-[var(--sidebar-width)]' : undefined}>
        <AppHeader
          profileLabel={getUserDisplayName()}
          roleLabel={authState.profile?.role}
          avatarUrl={authState.profile?.avatarUrl}
          menuTriggerStyle={isMultiTenant ? 'avatar' : 'overflow'}
          onLogout={handleLogout}
          appTitle={appTitle}
          breadcrumbs={breadcrumbs.map((c) => ({ label: c.label ?? '', href: c.href }))}
          mobileTrigger={triggerButton}
          accountLinks={accountLinks}
        />

        <main className='relative min-h-screen pt-14'>
          {/* ── Tab strip for mobile/tablet in self-hosted mode ─────────────── */}
          {showSidebar && (
            <div className='bg-background border-b lg:hidden'>
              <div className='flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                {visibleGroups
                  .flatMap((g) => g.items)
                  .map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={[
                        '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap',
                        isActive(item.path)
                          ? 'border-primary text-foreground'
                          : 'text-muted-foreground hover:text-foreground border-transparent',
                      ].join(' ')}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </div>
            </div>
          )}
          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
            {children || <Outlet />}
          </div>
        </main>
      </SidebarInset>
    </SidebarWrapper>
  )
}
