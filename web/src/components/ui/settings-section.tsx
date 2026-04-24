import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title?: string
  description?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function SettingsSection({
  title,
  description,
  children,
  className,
  contentClassName,
}: SettingsSectionProps) {
  return (
    <section className={cn('', className)}>
      {(title || description) && (
        <div className='mb-4 space-y-1'>
          {title && <h3 className='text-lg font-semibold'>{title}</h3>}
          {description && <div className='text-muted-foreground text-sm'>{description}</div>}
        </div>
      )}
      <div className={cn('border-t', contentClassName)}>{children}</div>
    </section>
  )
}
