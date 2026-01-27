import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from '@tanstack/react-router'
import { Check, Languages, LogOut, MoreVertical, Settings } from 'lucide-react'

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
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MobileBreadcrumb } from '@/components/ui/mobile-breadcrumb'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useBreadcrumb } from '@/hooks/use-breadcrumb'
import { availableLanguages } from '@/i18n'
import { useAuth } from '@/stores/auth-store'
import { setLocale } from '@/stores/locale-store'
import { useSidebar } from '@/stores/sidebar-store'

interface HeaderBarProps {
  isScrolled?: boolean
  customMenuItems?: React.ReactNode
  selectionMenu?: React.ReactNode
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  isScrolled: isScrolledDown = false,
  customMenuItems,
  selectionMenu,
}) => {
  const { t, i18n } = useTranslation()
  const { logout, authState } = useAuth()
  const navigate = useNavigate()
  const breadcrumbs = useBreadcrumb()
  const sidebar = useSidebar()

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
    const role = authState.profile?.role
    return role ? t(`pages.users.roles.${role}`) : null
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

  // Handle language change
  const handleLanguageChange = async (languageCode: string) => {
    // Use the locale store to save and apply the language
    await setLocale(languageCode)
  }

  return (
    <TooltipProvider>
      {/* Spacer - preserves layout when header becomes fixed */}
      {isScrolledDown && <div className='h-[56px] w-full sm:h-[48px]' aria-hidden='true' />}

      {/* Actual header */}
      <header
        className={`top-0 z-10 w-full px-2 ${isScrolledDown ? `bg-card/75 dark:shadow-secondary fixed shadow backdrop-blur transition-[left] duration-200 ease-linear ${sidebar && sidebar.open ? 'md:left-[var(--sidebar-width)] md:pr-[calc(var(--sidebar-width)+0.5rem)]' : ''} md:left-0` : ''}`}
      >
        <div className='mx-auto'>
          <div
            className={`flex items-center justify-between px-2 py-1 ${isScrolledDown ? 'md:mx-6' : ''}`}
          >
            <div className='flex items-center space-x-1 sm:space-x-2'>
              {/* Sidebar Toggle */}
              <SidebarTrigger className='-ml-2 h-12 w-12 sm:h-10 sm:w-10' />

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
                            <Link to={breadcrumb.href} draggable={false}>
                              {breadcrumb.label}
                            </Link>
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

            <div className='flex items-center space-x-2'>
              {selectionMenu}
              <ModeToggle />
              {!authState.isEmbedded && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-12 w-12 sm:h-10 sm:w-10'>
                      <MoreVertical className='h-4 w-4' />
                      <span className='sr-only'>{t('common.buttons.more')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-56'>
                    {/* Custom menu items slot - for page-specific functionality */}
                    {customMenuItems}

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
                        className='interactive:cursor-pointer'
                        onClick={handleLoginClick}
                      >
                        <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                        {t('common.navigation.login')}
                      </DropdownMenuItem>
                    ) : (
                      // Authenticated user menu
                      <>
                        {/* Language Selector Submenu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Languages className='text-muted-foreground mr-3 h-4 w-4' />
                            {t('common.language.title')}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              {availableLanguages.map((lang) => (
                                <DropdownMenuItem
                                  key={lang.code}
                                  className='hover:cursor-pointer'
                                  onSelect={(event) => {
                                    event.preventDefault()
                                    handleLanguageChange(lang.code)
                                  }}
                                >
                                  {lang.name}
                                  {i18n.language === lang.code && (
                                    <Check className='ml-auto h-4 w-4' />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className='interactive:cursor-pointer'
                          onClick={handleAccountClick}
                        >
                          <Settings className='text-muted-foreground mr-3 h-4 w-4' />
                          {t('common.navigation.settings')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='interactive:cursor-pointer'
                          onClick={handleLogout}
                        >
                          <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                          {t('common.navigation.signOut')}
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  )
}
