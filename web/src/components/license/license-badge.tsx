import { useTranslation } from 'react-i18next'
import { Key } from 'lucide-react'

import { Button } from '@/components/ui/button.tsx'
import { useLicense } from '@/stores/license-store.ts'

interface LicenseBadgeProps {
  side?: 'left' | 'right'
  theme?: 'light' | 'dark' | 'auto'
}

const getThemeClasses = (theme: string) => {
  if (theme === 'light') {
    return 'bg-blue-100/80 text-blue-800 hover-touch:bg-blue-200/80 hover-touch:text-blue-900'
  } else if (theme === 'dark') {
    return 'bg-blue-900/70 text-blue-200 hover-touch:bg-blue-700/70 hover-touch:text-blue-100'
  } else {
    return 'bg-blue-100/80 text-blue-800 hover-touch:bg-blue-200/80 dark:bg-blue-900/70 dark:text-blue-200 hover-touch:text-blue-900 dark:hover-touch:text-blue-100 dark:hover-touch:bg-blue-700/70'
  }
}

export const LicenseBadge = ({ side = 'right', theme = 'auto' }: LicenseBadgeProps) => {
  const { t } = useTranslation()
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return null
  }

  const positionClasses = side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'

  return (
    <Button
      variant='ghost'
      size='sm'
      className={`absolute top-4 ${positionClasses} z-50 flex h-auto items-center gap-2 rounded-full px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm transition-colors ${getThemeClasses(theme)}`}
      onClick={showSupportDialog}
      tabIndex={-1}
    >
      <Key className='h-4 w-4' />
      <span>{t('components.licenseBadge.unregistered')}</span>
    </Button>
  )
}
