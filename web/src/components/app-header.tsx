import { useTranslation } from 'react-i18next'
import { Link, type LinkComponentProps } from '@tanstack/react-router'
import { Check, Languages, LogOut, Settings } from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle.tsx'
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
import { availableLanguages } from '@/i18n'
import { setLocale } from '@/stores/locale-store'

// ── Avatar helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  if (!name) return '?'
  return name.slice(0, 2).toUpperCase()
}

const AVATAR_BG = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
] as const

function avatarBg(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_BG[h % AVATAR_BG.length]
}

// ── Component ────────────────────────────────────────────────────────────────

interface AppShellHeaderProps {
  leftSlot?: React.ReactNode
  mobileTitle?: React.ReactNode
  profileLabel: string
  roleLabel?: string
  onLogout: () => void | Promise<void>
  profileLink?: LinkComponentProps['to']
  profileText?: string
  signOutText?: string
  moreText?: string
}

export function AppHeader({
  leftSlot,
  mobileTitle,
  profileLabel,
  roleLabel,
  onLogout,
  profileLink = '/account/profile',
  profileText = 'Profile',
  signOutText = 'Sign Out',
  moreText = 'More',
}: AppShellHeaderProps) {
  const { t, i18n } = useTranslation()
  const initials = getInitials(profileLabel)
  const bgColor = avatarBg(profileLabel)

  return (
    <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto px-4 py-1'>
        <div className='flex min-h-10 items-center justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='hidden sm:block'>{leftSlot}</div>
            {mobileTitle ? <div className='sm:hidden'>{mobileTitle}</div> : null}
          </div>

          <div className='-mr-2 flex shrink-0 items-center space-x-1'>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-9 w-9 rounded-full p-0 focus-visible:ring-2'
                  aria-label={moreText}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${bgColor}`}
                  >
                    {initials}
                  </div>
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
                          onSelect={(e) => {
                            e.preventDefault()
                            setLocale(lang.code)
                          }}
                        >
                          {lang.name}
                          {i18n.language === lang.code && <Check className='ml-auto h-4 w-4' />}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={profileLink}>
                    <Settings className='text-muted-foreground mr-3 h-4 w-4' />
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
