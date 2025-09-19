import React from 'react'
import { Heart } from 'lucide-react'

import { useLicense } from '../stores/license-store'
import { Button } from './ui/button'

export const FloatingLicenseBadge: React.FC = () => {
  const { isLicensed, showSupportDialog } = useLicense()

  if (isLicensed) {
    return null
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      className='absolute top-4 right-8 z-1 flex h-auto items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm text-blue-800 shadow-lg backdrop-blur-sm transition-colors hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30'
      onClick={showSupportDialog}
    >
      <Heart className='h-4 w-4' />
      <span>Unregistered</span>
    </Button>
  )
}
