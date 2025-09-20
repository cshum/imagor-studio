import { Key } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLicense } from '@/stores/license-store'

interface LicenseBadgeProps {
  side?: 'left' | 'right'
  theme?: 'light' | 'dark' | 'auto'
}

export const LicenseBadge = ({ side = 'right', theme = 'auto' }: LicenseBadgeProps) => {
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return null
  }

  const positionClasses = side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'

  const getThemeClasses = () => {
    if (theme === 'light') {
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    } else if (theme === 'dark') {
      return 'bg-blue-900/80 text-blue-200 hover:bg-blue-900/90'
    } else {
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/80 dark:text-blue-200 dark:hover:bg-blue-900/90'
    }
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      className={`absolute top-4 ${positionClasses} z-50 flex h-auto items-center gap-2 rounded-full px-4 py-2 text-sm shadow-lg backdrop-blur-sm transition-colors ${getThemeClasses()}`}
      onClick={showSupportDialog}
    >
      <Key className='h-4 w-4' />
      <span>Unregistered</span>
    </Button>
  )
}
