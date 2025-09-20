import { Key } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLicense } from '@/stores/license-store'

interface LicenseBadgeProps {
  side?: 'left' | 'right'
}

export const LicenseBadge = ({ side = 'right' }: LicenseBadgeProps) => {
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return null
  }

  const positionClasses = side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'

  return (
    <Button
      variant='ghost'
      size='sm'
      className={`absolute top-4 ${positionClasses} z-50 flex h-auto items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 shadow-lg backdrop-blur-sm transition-colors hover:bg-blue-200 dark:bg-blue-900/80 dark:text-blue-300 dark:hover:bg-blue-900/90`}
      onClick={showSupportDialog}
    >
      <Key className='h-4 w-4' />
      <span>Unregistered</span>
    </Button>
  )
}
