import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, MoreVertical, Settings } from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileBreadcrumb } from '@/components/ui/mobile-breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBreadcrumb } from '@/hooks/use-breadcrumb'
import { useAuth } from '@/stores/auth-store'
import { useSidebar } from '@/stores/sidebar-store'

interface HeaderBarProps {
  isScrolled?: boolean
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ isScrolled: isScrolledDown = false }) => {
  const { t } = useTranslation()
  const { logout, authState } = useAuth()
  const navigate = useNavigate()
  const breadcrumbs = useBreadcrumb()
  const sidebar = useSidebar()

  // Get user display name
  const getUserDisplayName = () => {
    if (authState.state === 'guest') {
      return t('common.status.guest')
    }
    return authState.profile?.displayName || authState.profile?.email || t('common.status.user')
  }

  // Get user role display (only for authenticated users)
  const getUserRole = () => {
    if (authState.state === 'guest') {
      return null // No role subtitle for guests
    }
    return authState.profile?.role || null
  }

  // Handle login navigation for guests
  const handleLoginClick = async () => {
    navigate({ to: '/login' })
  }

  // Handle logout for authenticated users
  const handleLogout = async () => {
    await logout()
    navigate({ to: '/' })
  }

  // Handle account settings navigation
  const handleAccountClick = () => {
    navigate({ to: '/account' })
  }

  return (
    <TooltipProvider>
      <header
        className={`top-0 z-10 w-full px-2 ${isScrolledDown ? `bg-card/75 dark:shadow-secondary fixed shadow backdrop-blur ${sidebar && sidebar.open ? 'md:left-[var(--sidebar-width)] md:w-[calc(100%-var(--sidebar-width))] md:peer-data-[state=collapsed]:left-[var(--sidebar-width-icon)] md:peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon))]' : ''} md:left-0 md:peer-data-[collapsible=offcanvas]:w-full` : ''}`}
      >
        <div className='mx-auto'>
          <div
            className={`flex items-center justify-between px-2 py-1 ${isScrolledDown ? 'md:mx-6' : ''}`}
          >
            <div className='flex items-center space-x-2'>
              {/* Sidebar Toggle */}
              <SidebarTrigger className='-ml-2' />

              {/* Mobile: Dropdown-style breadcrumb */}
              <MobileBreadcrumb breadcrumbs={breadcrumbs} className='block sm:hidden' />

              {/* Desktop: Dynamic breadcrumb */}
              <Breadcrumb className='hidden sm:block'>
                <BreadcrumbList>
                  {breadcrumbs.map((breadcrumb, index) => (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {breadcrumb.href && !breadcrumb.isActive ? (
                          <BreadcrumbLink asChild>
                            <Link to={breadcrumb.href}>{breadcrumb.label}</Link>
                          </BreadcrumbLink>
                        ) : (
                          <span className={breadcrumb.isActive ? 'font-medium' : ''}>
                            {breadcrumb.label}
                          </span>
                        )}
                      </BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className='flex items-center space-x-1'>
              <ModeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon'>
                    <MoreVertical className='h-4 w-4' />
                    <span className='sr-only'>{t('common.buttons.more')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-56'>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm leading-none font-medium'>{getUserDisplayName()}</p>
                      {getUserRole() && (
                        <p className='text-muted-foreground text-xs leading-none capitalize'>
                          {getUserRole()}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {authState.state === 'guest' ? (
                    // Guest user menu
                    <DropdownMenuItem className='hover:cursor-pointer' onClick={handleLoginClick}>
                      <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                      {t('common.navigation.login')}
                    </DropdownMenuItem>
                  ) : (
                    // Authenticated user menu
                    <>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onClick={handleAccountClick}
                      >
                        <Settings className='text-muted-foreground mr-3 h-4 w-4' />
                        {t('common.navigation.accountSettings')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className='hover:cursor-pointer' onClick={handleLogout}>
                        <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                        {t('common.navigation.signOut')}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
