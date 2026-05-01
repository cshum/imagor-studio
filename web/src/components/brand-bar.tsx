import { Link } from '@tanstack/react-router'

// BrandBar — consistent top bar used on all full-page unauthenticated screens
// (login, error, admin-setup, create-space wizard).
// Intentionally NOT the AppShellHeader — no user avatar, no breadcrumb.

import { useBrand } from '@/hooks/use-brand'
import { useAuth } from '@/stores/auth-store'

const DEFAULT_BRAND_URL = 'https://imagor.net'

interface BrandBarProps {
  /** Extra controls placed on the right (e.g. ModeToggle, LanguageSelector) */
  rightSlot?: React.ReactNode
}

export function BrandBar({ rightSlot }: BrandBarProps) {
  const { title: appTitle, url: appUrl } = useBrand()
  const { authState } = useAuth()
  const useInternalBrandLink = authState.multiTenant && appUrl === DEFAULT_BRAND_URL

  return (
    <div className='flex items-center gap-2 border-b px-4 py-3 sm:px-6'>
      <div className='flex min-w-0 flex-1'>
        {useInternalBrandLink ? (
          <Link
            to='/'
            className='text-foreground hover:text-foreground/80 truncate text-lg font-bold sm:text-xl'
          >
            {appTitle}
          </Link>
        ) : (
          <a
            href={appUrl}
            target='_blank'
            rel='noreferrer'
            className='text-foreground hover:text-foreground/80 truncate text-lg font-bold sm:text-xl'
          >
            {appTitle}
          </a>
        )}
      </div>
      {rightSlot && (
        <div className='ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2'>{rightSlot}</div>
      )}
    </div>
  )
}
