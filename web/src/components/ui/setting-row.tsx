import { cn } from '@/lib/utils'

// ── SettingRow ─────────────────────────────────────────────────────────────────
// Horizontal two-column layout: label + description on the left (2/5 width),
// form control on the right (3/5 width, max-xs).
// Used by ProfilePage, SpaceSettingsPage general section, and similar settings cards.
// Mirrors the SystemSettingsForm row pattern for visual consistency.

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  last?: boolean
  className?: string
}

export function SettingRow({ label, description, children, last, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8',
        !last && 'border-b',
        className,
      )}
    >
      <div className='min-w-0 sm:w-2/5'>
        <p className='text-sm leading-none font-medium'>{label}</p>
        {description && (
          <p className='text-muted-foreground mt-1.5 text-sm leading-snug'>{description}</p>
        )}
      </div>
      <div className='sm:w-3/5 sm:max-w-xs'>{children}</div>
    </div>
  )
}
