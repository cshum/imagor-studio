import React from 'react'
import { Heart, Shield } from 'lucide-react'
import { Button } from './ui/button'
import { useLicense } from '../stores/license-store'

export const LicenseBadge: React.FC = () => {
  const { isLicensed, showSupportDialog } = useLicense()
  
  if (isLicensed) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full text-sm">
        <Shield className="w-4 h-4" />
        <span>Licensed</span>
      </div>
    )
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors h-auto"
      onClick={showSupportDialog}
    >
      <Heart className="w-4 h-4" />
      <span>Support Development</span>
    </Button>
  )
}
