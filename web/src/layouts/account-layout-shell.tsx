import { PropsWithChildren, useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, PanelLeft } from 'lucide-react'

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

export interface AccountNavItem {
  id: string
  path: string
  icon: React.ReactNode
  label: string
}

export interface AccountNavGroup {
  heading: string
  items: AccountNavItem[]
}

interface AccountLayoutShellProps extends PropsWithChildren {
  title: string
  showSidebar: boolean
  groups: AccountNavGroup[]
  backLabel: string
}

export function AccountLayoutShell({
  children,
  title,
  showSidebar,
  groups,
  backLabel,
}: AccountLayoutShellProps) {
  const { authState, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()
  const breadcrumbs = useBreadcrumb()
  const [mobileOpen, setMobileOpen] = useState(false)

  useScrollHandler(location.pathname)

  useEffect(() => {
    requestAnimationFrame(() => restoreScrollPosition(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/')

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || 'User'

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  const navContent = (
    <>
      <SidebarContent>
        {groups.map((group, gi) => (
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
                <span>{backLabel}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )

  const triggerButton = showSidebar ? (
    <Button
      variant='ghost'
      size='icon'
      className='-my-0.5 -ml-2 h-11 w-11 shrink-0 lg:hidden [&_svg]:size-5'
      onClick={() => setMobileOpen(true)}
      aria-label={title}
    >
      <PanelLeft />
    </Button>
  ) : null

  return (
    <SidebarWrapper>
      {showSidebar && (
        <Sidebar
          collapsible='none'
          className='fixed top-14 bottom-0 left-0 z-10 hidden h-auto border-r lg:flex'
        >
          {navContent}
        </Sidebar>
      )}

      {showSidebar && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side='left'
            className='bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden'
            style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
          >
            <SheetHeader className='sr-only'>
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription>{title}</SheetDescription>
            </SheetHeader>
            <div className='flex h-full flex-col'>{navContent}</div>
          </SheetContent>
        </Sheet>
      )}

      <SidebarInset className={showSidebar ? 'lg:pl-[var(--sidebar-width)]' : undefined}>
        <AppHeader
          profileLabel={getUserDisplayName()}
          roleLabel={authState.profile?.role}
          avatarUrl={authState.profile?.avatarUrl}
          onLogout={handleLogout}
          appTitle={appTitle}
          breadcrumbs={breadcrumbs.map((c) => ({ label: c.label ?? '', href: c.href }))}
          mobileTrigger={triggerButton}
        />

        <main className='relative min-h-screen pt-14'>
          {showSidebar && (
            <div className='bg-background border-b lg:hidden'>
              <div className='flex overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                {groups.flatMap((g) => g.items).map((item) => (
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
          <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>{children || <Outlet />}</div>
        </main>
      </SidebarInset>
    </SidebarWrapper>
  )
}
