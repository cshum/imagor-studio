import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  title: string
  description?: string
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
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className='space-y-1 pb-4'>
        <CardTitle className='text-base font-semibold'>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn('space-y-0', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
