import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import {
  Check,
  Clock,
  FileText,
  HardDrive,
  LogOut,
  MoreVertical,
  Settings,
  SortAsc,
  SortDesc,
} from 'lucide-react'

import { getUserRegistryMultiple, setUserRegistryMultiple } from '@/api/registry-api.ts'
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
import { SortOption, SortOrder } from '@/generated/graphql'
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
  const router = useRouter()
  const breadcrumbs = useBreadcrumb()
  const sidebar = useSidebar()

  // Sorting state
  const [currentSortBy, setCurrentSortBy] = useState<SortOption>('MODIFIED_TIME')
  const [currentSortOrder, setCurrentSortOrder] = useState<SortOrder>('DESC')

  // Load current user sorting preferences
  useEffect(() => {
    const loadUserSortingPreferences = async () => {
      if (authState.profile?.id && authState.state === 'authenticated') {
        try {
          const userRegistry = await getUserRegistryMultiple(
            ['config.app_default_sort_by', 'config.app_default_sort_order'],
            authState.profile.id,
          )

          const sortByEntry = userRegistry.find((r) => r.key === 'config.app_default_sort_by')
          const sortOrderEntry = userRegistry.find((r) => r.key === 'config.app_default_sort_order')

          if (sortByEntry?.value) {
            setCurrentSortBy(sortByEntry.value as SortOption)
          }
          if (sortOrderEntry?.value) {
            setCurrentSortOrder(sortOrderEntry.value as SortOrder)
          }
        } catch {
          // Failed to load user preferences, keep defaults
        }
      }
    }

    loadUserSortingPreferences()
  }, [authState.profile?.id, authState.state])

  // Handle sorting change
  const handleSortChange = async (sortBy: SortOption, sortOrder: SortOrder) => {
    if (authState.profile?.id && authState.state === 'authenticated') {
      try {
        // Save user preferences to registry
        await setUserRegistryMultiple(
          [
            { key: 'config.app_default_sort_by', value: sortBy, isEncrypted: false },
            { key: 'config.app_default_sort_order', value: sortOrder, isEncrypted: false },
          ],
          authState.profile.id,
        )

        // Update local state
        setCurrentSortBy(sortBy)
        setCurrentSortOrder(sortOrder)

        // Invalidate only the current gallery route to trigger loader reload
        router.invalidate({
          filter: (route) => {
            // Only invalidate gallery routes (root path or gallery routes)
            return route.routeId === '/' || route.routeId === '/gallery/$galleryKey'
          },
        })
      } catch {
        // saliently fail for not saving user preference
      }
    }
  }

  // Get user display name
  const getUserDisplayName = () => {
    if (authState.state === 'guest') {
      return t('common.status.guest')
    }
    return authState.profile?.displayName || authState.profile?.username || t('common.status.user')
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
    navigate({ to: '/account/profile' })
  }

  return (
    <TooltipProvider>
      {/* Spacer - preserves layout when header becomes fixed */}
      {isScrolledDown && <div className='h-[48px] w-full' aria-hidden='true' />}

      {/* Actual header */}
      <header
        className={`top-0 z-10 w-full px-2 ${isScrolledDown ? `bg-card/75 dark:shadow-secondary fixed shadow backdrop-blur transition-[left] duration-200 ease-linear ${sidebar && sidebar.open ? 'md:left-[var(--sidebar-width)] md:pr-[calc(var(--sidebar-width)+0.5rem)]' : ''} md:left-0` : ''}`}
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
                  {/* Sorting options - only show for authenticated users */}
                  {authState.state === 'authenticated' && (
                    <>
                      <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onSelect={(event) => {
                          event.preventDefault()
                          handleSortChange('NAME', currentSortOrder)
                        }}
                      >
                        <FileText className='text-muted-foreground mr-3 h-4 w-4' />
                        Name
                        {currentSortBy === 'NAME' && <Check className='ml-auto h-4 w-4' />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onSelect={(event) => {
                          event.preventDefault()
                          handleSortChange('MODIFIED_TIME', currentSortOrder)
                        }}
                      >
                        <Clock className='text-muted-foreground mr-3 h-4 w-4' />
                        Modified Time
                        {currentSortBy === 'MODIFIED_TIME' && <Check className='ml-auto h-4 w-4' />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onSelect={(event) => {
                          event.preventDefault()
                          handleSortChange('SIZE', currentSortOrder)
                        }}
                      >
                        <HardDrive className='text-muted-foreground mr-3 h-4 w-4' />
                        Size
                        {currentSortBy === 'SIZE' && <Check className='ml-auto h-4 w-4' />}
                      </DropdownMenuItem>

                      <DropdownMenuLabel>Sort order</DropdownMenuLabel>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onSelect={(event) => {
                          event.preventDefault()
                          handleSortChange(currentSortBy, 'ASC')
                        }}
                      >
                        <SortAsc className='text-muted-foreground mr-3 h-4 w-4' />
                        Ascending
                        {currentSortOrder === 'ASC' && <Check className='ml-auto h-4 w-4' />}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className='hover:cursor-pointer'
                        onSelect={(event) => {
                          event.preventDefault()
                          handleSortChange(currentSortBy, 'DESC')
                        }}
                      >
                        <SortDesc className='text-muted-foreground mr-3 h-4 w-4' />
                        Descending
                        {currentSortOrder === 'DESC' && <Check className='ml-auto h-4 w-4' />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

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
