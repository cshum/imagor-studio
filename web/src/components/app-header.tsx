import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Check, Languages, LogOut, MoreVertical } from 'lucide-react'

import { ModeToggle } from '@/components/mode-toggle.tsx'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

// ── Types ────────────────────────────────────────────────────────────────────

export interface AppHeaderBreadcrumb {
  label: string
  /** When provided the segment renders as a Link; omit for plain text (last segment). */
  href?: string
}

interface AppHeaderProps {
  // ── Left side ─────────────────────────────────────────────────────────────
  /** Bold app logo text */
  appTitle?: string
  /** href for the app logo link — defaults to "/" */
  appHref?: string
  /**
   * Breadcrumb segments rendered after the logo with a "|" separator.
   * Each item with `href` is a link; the last item without `href` is plain text.
   */
  breadcrumbs?: AppHeaderBreadcrumb[]
  /** Optional sidebar-open trigger rendered before the logo (mobile/tablet) */
  mobileTrigger?: React.ReactNode

  // ── Right side ────────────────────────────────────────────────────────────
  profileLabel: string
  roleLabel?: string
  /** Optional avatar image URL (e.g. from Google OAuth). Falls back to initials. */
  avatarUrl?: string | null
  menuTriggerStyle?: 'avatar' | 'overflow'
  onLogout: () => void | Promise<void>
  profileLink?: string
}

// ── Component ────────────────────────────────────────────────────────────────

export function AppHeader({
  appTitle,
  appHref = '/',
  breadcrumbs,
  mobileTrigger,
  profileLabel,
  avatarUrl,
  menuTriggerStyle = 'avatar',
  onLogout,
  profileLink = '/account/profile',
}: AppHeaderProps) {
  const { t, i18n } = useTranslation()
  const accountSettingsText = t('common.navigation.accountSettings')
  const signOutText = t('common.navigation.signOut')
  const moreText = t('common.buttons.more')
  const initials = getInitials(profileLabel)
  const bgColor = avatarBg(profileLabel)

  // ── Left-side content ────────────────────────────────────────────────────
  const hasBreadcrumbs = breadcrumbs && breadcrumbs.length > 0

  // On mobile we show: trigger + logo + "|" + last breadcrumb label (truncated)
  const lastCrumb = hasBreadcrumbs ? breadcrumbs[breadcrumbs.length - 1] : null

  const leftContent = (
    <div className='flex min-w-0 items-center gap-1'>
      {mobileTrigger}
      {appTitle && (
        <Link to={appHref} className='shrink-0 text-xl font-bold'>
          {appTitle}
        </Link>
      )}
      {hasBreadcrumbs && (
        <>
          {/* Desktop: full breadcrumb trail using shadcn Breadcrumb */}
          <div className='hidden min-w-0 sm:flex sm:items-center'>
            <span className='text-border mx-3 shrink-0 select-none'>|</span>
            <Breadcrumb>
              <BreadcrumbList className='flex-nowrap'>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className='flex min-w-0 items-center gap-1.5'>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem className='min-w-0'>
                      {crumb.href ? (
                        <BreadcrumbLink asChild className='min-w-0 truncate'>
                          <Link to={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className='min-w-0 truncate'>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </span>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Mobile: only the last segment, truncated */}
          {lastCrumb && (
            <div className='flex min-w-0 items-center sm:hidden'>
              <span className='text-border mx-3 shrink-0 select-none'>|</span>
              <span className='min-w-0 truncate text-sm font-medium'>{lastCrumb.label}</span>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <header className='bg-background/95 supports-[backdrop-filter]:bg-background/60 fixed top-0 left-0 z-50 w-full border-b backdrop-blur'>
      <div className='mx-auto px-4 py-2'>
        <div className='flex min-h-10 items-center justify-between gap-3'>
          <div className='min-w-0 flex-1'>{leftContent}</div>

          <div className='-mr-1 flex shrink-0 items-center space-x-1'>
            <ModeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='rounded-full p-0 focus-visible:ring-2'
                  aria-label={moreText}
                >
                  {menuTriggerStyle === 'overflow' ? (
                    <MoreVertical className='text-muted-foreground h-5 w-5' />
                  ) : (
                    <>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={profileLabel}
                          referrerPolicy='no-referrer'
                          className='h-9 w-9 rounded-full object-cover lg:h-8 lg:w-8'
                        />
                      ) : (
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white lg:h-8 lg:w-8 ${bgColor}`}
                        >
                          {initials}
                        </div>
                      )}
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuItem
                  className='interactive:cursor-pointer items-start px-2 py-2'
                  asChild
                >
                  <Link
                    to={profileLink}
                    className='flex w-full min-w-0 flex-col items-start text-left'
                  >
                    <p className='truncate text-sm leading-none font-medium'>{profileLabel}</p>
                    <p className='text-muted-foreground mt-1 truncate text-xs leading-none'>
                      {accountSettingsText}
                    </p>
                  </Link>
                </DropdownMenuItem>
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
