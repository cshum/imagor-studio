import React from 'react'
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
import { MobileBreadcrumb } from '@/components/ui/mobile-breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useBreadcrumb } from '@/hooks/use-breadcrumb'
import { useAuth } from '@/stores/auth-store'

interface HeaderBarProps {
  isScrolled?: boolean
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  isScrolled: isScrolledDown = false,
}) => {
  const { logout, authState } = useAuth()
  const navigate = useNavigate()
  const breadcrumbs = useBreadcrumb()

  // Get user display name
  const getUserDisplayName = () => {
    if (authState.state === 'guest') {
      return 'Guest'
    }
    return authState.profile?.displayName || authState.profile?.email || 'User'
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
    // First logout to clear guest state, then navigate to login
    await logout()
    navigate({ to: '/login' })
  }

  // Handle logout for authenticated users
  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  // Handle account settings navigation
  const handleAccountClick = () => {
    navigate({ to: '/account' })
  }

  return (
    <TooltipProvider>
      <header
        className={`top-0 z-10 w-full px-2 ${isScrolledDown ? 'sticky bg-card/75 dark:shadow-secondary shadow backdrop-blur md:-mx-6 md:w-[calc(100%+48px)]' : ''}`}
      >
        <div className='mx-auto'>
          <div
            className={`flex items-center justify-between px-2 py-1 ${isScrolledDown ? 'md:mx-6' : ''}`}
          >
            <div className='flex items-center space-x-2'>
              {/* Sidebar Toggle */}
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />

              {/* Mobile: Dropdown-style breadcrumb */}
              <MobileBreadcrumb 
                breadcrumbs={breadcrumbs} 
                className='block sm:hidden' 
              />

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
                    <span className='sr-only'>More</span>
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
                    <DropdownMenuItem
                      className='hover:cursor-pointer'
                      onClick={handleLoginClick}
                    >
                      <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                      Login
                    </DropdownMenuItem>
                  ) : (
                    // Authenticated user menu
                    <>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onClick={handleAccountClick}
                      >
                        <Settings className='text-muted-foreground mr-3 h-4 w-4' />
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onClick={handleLogout}
                      >
                        <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                        Sign Out
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
