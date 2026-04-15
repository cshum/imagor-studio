import { Link, type LinkComponentProps } from '@tanstack/react-router'
import { LogOut, MoreVertical, User } from 'lucide-react'

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

interface AppShellHeaderProps {
  leftSlot?: React.ReactNode
  profileLabel: string
  roleLabel?: string
  onLogout: () => void | Promise<void>
  profileLink?: LinkComponentProps['to']
  profileText?: string
  signOutText?: string
  moreText?: string
}

export function AppShellHeader({
  leftSlot,
  profileLabel,
  roleLabel,
  onLogout,
  profileLink = '/account/profile',
  profileText = 'Profile',
  signOutText = 'Sign Out',
  moreText = 'More',
}: AppShellHeaderProps) {
  return (
    <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto px-4 py-2'>
        <div className='flex min-h-10 items-center justify-between gap-3'>
          <div className='min-w-0 flex-1'>{leftSlot}</div>

          <div className='flex shrink-0 items-center space-x-1'>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='icon' className='h-10 w-10'>
                  <MoreVertical className='h-4 w-4' />
                  <span className='sr-only'>{moreText}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm leading-none font-medium'>{profileLabel}</p>
                    {roleLabel ? (
                      <p className='text-muted-foreground text-xs leading-none capitalize'>
                        {roleLabel}
                      </p>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={profileLink}>
                    <User className='text-muted-foreground mr-3 h-4 w-4' />
                    {profileText}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className='cursor-pointer'>
                  <LogOut className='text-muted-foreground mr-3 h-4 w-4' />
                  {signOutText}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}