import { Key } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLicense } from '@/stores/license-store'

export const LicenseBadge = () => {
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return null
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      className='mid:right-8 absolute top-4 right-4 z-1 flex h-auto items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 shadow-lg backdrop-blur-sm transition-colors hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
      onClick={showSupportDialog}
    >
      <Key className='h-4 w-4' />
      <span>Unregistered</span>
    </Button>
  )
}
