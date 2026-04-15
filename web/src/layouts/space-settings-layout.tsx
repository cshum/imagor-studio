import { PropsWithChildren } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LogOut, MoreVertical } from 'lucide-react'

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
import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'

// ── Component ─────────────────────────────────────────────────────────────────
// Header-only settings layout (no collapsible sidebar) — used for per-space
// settings pages which render their own section nav inline.

export function SpaceSettingsLayout({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const { authState, logout } = useAuth()
  const navigate = useNavigate()
  const { title: appTitle } = useBrand()

  const getUserDisplayName = () =>
    authState.profile?.displayName || authState.profile?.username || t('common.status.user')

  const handleLogout = async () => {
    await logout()
    navigate({ to: '/login' })
  }

  return (
    <div>
      {/* Fixed full-width header — same style as AccountLayout */}
      <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
        <div className='mx-auto px-4 py-2'>
          <div className='flex h-10 items-center justify-between'>
            {/* Left: app title + separator + section label */}
            <div className='flex items-center space-x-1 sm:space-x-2'>
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
                      <p className='text-sm leading-none font-medium'>{getUserDisplayName()}</p>
                      {authState.profile?.role && (
                        <p className='text-muted-foreground text-xs leading-none capitalize'>
                          {authState.profile.role}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to='/account/spaces'>
                      <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                      {t('pages.spaceSettings.backToSpaces')}
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
        <div className='mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8'>{children || <Outlet />}</div>
      </main>
    </div>
  )
}
