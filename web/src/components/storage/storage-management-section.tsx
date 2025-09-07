import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { getStorageStatus } from '@/api/storage-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StorageStatusQuery } from '@/generated/graphql'

import { StorageConfigurationWizard } from './storage-configuration-wizard'

export function StorageManagementSection() {
  const [storageStatus, setStorageStatus] = useState<StorageStatusQuery['storageStatus'] | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [showConfigDialog, setShowConfigDialog] = useState(false)

  const loadStorageStatus = async () => {
    try {
      setIsLoading(true)
      const status = await getStorageStatus()
      setStorageStatus(status)
    } catch (error) {
      toast.error('Failed to load storage status')
      console.error('Storage status error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStorageStatus()
  }, [])

  const handleStorageConfigured = (restartRequired: boolean) => {
    setShowConfigDialog(false)
    if (restartRequired) {
      toast.success('Storage configured successfully! Please restart the server to apply changes.')
    } else {
      toast.success('Storage configured successfully!')
    }
    // Reload storage status
    loadStorageStatus()
  }

  const getStorageTypeDisplay = (type: string | null) => {
    if (!type) return 'Not Configured'
    return type === 'FILE' ? 'File Storage' : 'S3 Storage'
  }

  const getStatusBadge = () => {
    if (isLoading) return <Badge variant='secondary'>Loading...</Badge>
    if (!storageStatus?.configured) return <Badge variant='destructive'>Not Configured</Badge>
    if (storageStatus.restartRequired) return <Badge variant='outline'>Restart Required</Badge>
    return <Badge variant='default'>Active</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Storage Configuration</CardTitle>
          <CardDescription>
            Manage where your images and files are stored. Changes may require a server restart.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>Storage Type</div>
              <div className='text-base'>
                {isLoading ? 'Loading...' : getStorageTypeDisplay(storageStatus?.type || null)}
              </div>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>Status</div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>

          {storageStatus?.lastUpdated && (
            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>Last Updated</div>
              <div className='text-sm'>
                {new Date(storageStatus.lastUpdated || new Date()).toLocaleString()}
              </div>
            </div>
          )}

          {storageStatus?.restartRequired && (
            <div className='rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950'>
              <div className='text-sm text-orange-800 dark:text-orange-200'>
                <strong>Server restart required:</strong> Storage configuration changes will take
                effect after restarting the server.
              </div>
            </div>
          )}

          <div className='flex gap-3 pt-2'>
            <Button onClick={() => setShowConfigDialog(true)} disabled={isLoading}>
              {storageStatus?.configured ? 'Reconfigure Storage' : 'Configure Storage'}
            </Button>

            <Button variant='outline' onClick={loadStorageStatus} disabled={isLoading}>
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {storageStatus?.configured ? 'Reconfigure Storage' : 'Configure Storage'}
            </DialogTitle>
          </DialogHeader>
          <StorageConfigurationWizard
            title=''
            description=''
            onSuccess={handleStorageConfigured}
            onCancel={() => setShowConfigDialog(false)}
            showCancel={true}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
