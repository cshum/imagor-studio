import React from 'react'
import { Heart, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLicense } from '@/stores/license-store'

export const LicenseBadge: React.FC = () => {
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return (
      <div className='flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400'>
        <Shield className='h-4 w-4' />
        <span>Licensed</span>
      </div>
    )
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      className='flex h-auto items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 transition-colors hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
      onClick={showSupportDialog}
    >
      <Heart className='h-4 w-4' />
      <span>Support Development</span>
    </Button>
  )
}
