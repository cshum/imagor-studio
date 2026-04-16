// BrandBar — consistent top bar used on all full-page unauthenticated screens
// (login, error, admin-setup, create-space wizard).
// Intentionally NOT the AppShellHeader — no user avatar, no breadcrumb.

import { useBrand } from '@/hooks/use-brand'

interface BrandBarProps {
  /** Extra controls placed on the right (e.g. ModeToggle, LanguageSelector) */
  rightSlot?: React.ReactNode
}

export function BrandBar({ rightSlot }: BrandBarProps) {
  const { title: appTitle, url: appUrl } = useBrand()

  return (
    <div className='flex items-center gap-2 border-b px-6 py-3'>
      <div className='flex flex-1'>
        <a
          href={appUrl}
          target='_blank'
          className='text-foreground hover:text-foreground/80 text-xl font-bold'
        >
          {appTitle}
        </a>
      </div>
      {rightSlot && <div className='ml-auto flex items-center gap-2'>{rightSlot}</div>}
    </div>
  )
}
