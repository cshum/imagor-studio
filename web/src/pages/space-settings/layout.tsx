import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Link,
  Outlet,
  useMatches,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  Clock3,
  Cloud,
  Cpu,
  Database,
  HardDrive,
  LayoutDashboard,
  PanelLeft,
  Users,
} from 'lucide-react'

import { AppHeader } from '@/components/app-header.tsx'
import { LoadingBar } from '@/components/loading-bar'
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
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarWrapper,
} from '@/components/ui/sidebar'
import { useBrand } from '@/hooks/use-brand'

import '@/lib/space-propagation'

import { useSpacePropagationNotice } from '@/hooks/use-space-propagation-notice'
import { useAuth } from '@/stores/auth-store'

import { type SpaceSettingsData } from './shared'

// ── Section ids ────────────────────────────────────────────────────────────

export type SectionId = 'general' | 'storage' | 'imagor' | 'members'

// ── Layout component ───────────────────────────────────────────────────────

interface SpaceSettingsLayoutProps {
  space: SpaceSettingsData
  showOrganizationLink?: boolean
}

export function SpaceSettingsLayout({
  space,
  showOrganizationLink = false,
}: SpaceSettingsLayoutProps) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const { title: appTitle } = useBrand()
  const navigate = useNavigate()
  const router = useRouter()
  const matches = useMatches()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { location } = useRouterState()
  const propagationNotice = useSpacePropagationNotice(space.key, location.pathname)

  // Use the committed route match pathname so the settings shell does not
  // briefly lose its active section while navigating away on a slow network.
  const activePathname = (matches[matches.length - 1] as { pathname?: string } | undefined)
    ?.pathname
    ? String((matches[matches.length - 1] as { pathname?: string }).pathname)
    : location.pathname
  const pathSegments = activePathname.split('/')
  const activeSection = pathSegments[pathSegments.length - 1] ?? 'general'

  useEffect(() => {
    setMobileOpen(false)
  }, [activeSection])

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')
  const accountLinks =
    authState.multiTenant && showOrganizationLink
      ? [
          {
            label: t('navigation.breadcrumbs.organization'),
            href: '/account/organization',
            icon: <Building2 className='text-muted-foreground mr-3 h-4 w-4' />,
          },
        ]
      : []

  const handleLogout = async () => {
    await logout()
    await router.invalidate()
    navigate({ to: '/login' })
  }

  // ── Nav items ────────────────────────────────────────────────────────────

  type NavItem = { id: SectionId; to: string; icon: React.ReactNode; label: string }

  const navItems: NavItem[] = [
    {
      id: 'general',
      to: '/spaces/$spaceKey/settings/general',
      icon: <LayoutDashboard className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.general'),
    },
    {
      id: 'imagor',
      to: '/spaces/$spaceKey/settings/imagor',
      icon: <Cpu className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.imagor'),
    },
    {
      id: 'storage' as SectionId,
      to: '/spaces/$spaceKey/settings/storage',
      icon: <HardDrive className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.storage'),
    },
    {
      id: 'members',
      to: '/spaces/$spaceKey/settings/members',
      icon: <Users className='h-4 w-4' />,
      label: t('pages.spaceSettings.sections.members'),
    },
  ]

  const sectionDescriptions: Partial<Record<SectionId, string>> = {
    general: t('pages.spaceSettings.general.description'),
    storage: t('pages.spaceSettings.storage.description'),
    imagor: t('pages.spaceSettings.imagor.description'),
    members: t('pages.spaceSettings.members.description'),
  }

  const activeLabel = navItems.find((item) => item.id === activeSection)?.label ?? ''

  // ── Shared sidebar content ───────────────────────────────────────────────

  const sidebarContent = (
    <>
      <SidebarHeader className='border-b p-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size='lg'>
              <Link to='/spaces/$spaceKey' params={{ spaceKey: space.key }}>
                {space.storageMode === 'platform' ? (
                  <Cloud className='h-10 w-10 shrink-0' />
                ) : (
                  <Database className='h-10 w-10 shrink-0' />
                )}
                <div className='min-w-0'>
                  <span className='truncate text-sm leading-tight font-semibold'>{space.name}</span>
                  <span className='text-muted-foreground block truncate font-mono text-xs'>
                    {space.customDomain || `${space.key}.imagor.app`}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeSection === item.id}
                    className='data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground'
                  >
                    <Link
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      to={item.to as any}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      params={{ spaceKey: space.key } as any}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='border-t py-2'>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to='/'>
                <ArrowLeft className='h-4 w-4' />
                <span>{t('pages.spaceSettings.backToSpaces')}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )

  return (
    <SidebarWrapper>
      {/* Desktop settings sidebar — fixed, bypasses global store */}
      <Sidebar
        collapsible='none'
        className='fixed top-14 bottom-0 left-0 z-10 hidden h-auto border-r lg:flex'
      >
        {sidebarContent}
      </Sidebar>

      {/* Mobile / tablet sidebar sheet (local state) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side='left'
          className='bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden'
          style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
        >
          <SheetHeader className='sr-only'>
            <SheetTitle>{space.name}</SheetTitle>
            <SheetDescription>{space.key}</SheetDescription>
          </SheetHeader>
          <div className='flex h-full flex-col'>{sidebarContent}</div>
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <SidebarInset className='lg:pl-[var(--sidebar-width)]'>
        <LoadingBar isLoading={Boolean(router.state.isLoading)} size='thin' />
        <AppHeader
          profileLabel={getUserDisplayName()}
          roleLabel={authState.profile?.role}
          avatarUrl={authState.profile?.avatarUrl}
          onLogout={handleLogout}
          appTitle={appTitle}
          breadcrumbs={[
            { label: space.name, href: `/spaces/${space.key}` },
            { label: activeLabel },
          ]}
          mobileTrigger={
            <Button
              variant='ghost'
              size='icon'
              className='-my-0.5 -ml-2 h-11 w-11 shrink-0 lg:hidden [&_svg]:size-5'
              onClick={() => setMobileOpen(true)}
            >
              <PanelLeft />
            </Button>
          }
          accountLinks={accountLinks}
        />

        <main className='relative min-h-screen pt-14'>
          {/* Mobile section tab strip */}
          <div className='bg-background border-b lg:hidden'>
            <div className='flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  to={item.to as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  params={{ spaceKey: space.key } as any}
                  className={[
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium whitespace-nowrap',
                    activeSection === item.id
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

          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>
            {/* Page heading */}
            <div className='mb-8'>
              <h1 className='text-2xl font-semibold tracking-tight'>{activeLabel}</h1>
              {sectionDescriptions[activeSection as SectionId] && (
                <p className='text-muted-foreground mt-1 text-sm'>
                  {sectionDescriptions[activeSection as SectionId]}
                </p>
              )}
            </div>

            {propagationNotice && (
              <div className='mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'>
                <Clock3 className='mt-0.5 h-5 w-5 shrink-0' />
                <div>
                  <p className='text-sm font-semibold'>{t('pages.spacePropagation.title')}</p>
                  <p className='mt-1 text-sm text-amber-900/80 dark:text-amber-100/80'>
                    {t(
                      propagationNotice.action === 'created'
                        ? 'pages.spacePropagation.createDescription'
                        : 'pages.spacePropagation.description',
                    )}
                  </p>
                </div>
              </div>
            )}

            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarWrapper>
  )
}
