import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StorageStatusQuery } from '@/generated/graphql'

import { StorageConfigurationWizard } from './storage-configuration-wizard'

interface StorageManagementSectionProps {
  storageStatus: StorageStatusQuery['storageStatus'] | null
}

export function StorageManagementSection({ storageStatus }: StorageManagementSectionProps) {
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const router = useRouter()

  const handleStorageConfigured = (restartRequired: boolean) => {
    setShowConfigDialog(false)
    if (restartRequired) {
      toast.success('Storage configured successfully! Please restart the server to apply changes.')
    } else {
      toast.success('Storage configured successfully!')
    }
    // Invalidate the loader data to get fresh storage status
    router.invalidate()
  }

  const getStorageTypeDisplay = (type: string | null) => {
    if (!type) return 'Not Configured'
    return type.toLowerCase() === 'file' ? 'File Storage' : 'S3 Storage'
  }

  const getStatusBadge = () => {
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
              <div className='text-base'>{getStorageTypeDisplay(storageStatus?.type || null)}</div>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>Status</div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>

          {/* Display detailed configuration */}
          {storageStatus?.configured && (
            <div className='bg-muted/50 space-y-4 rounded-lg border p-4'>
              <div className='text-sm font-medium'>Configuration Details</div>

              {storageStatus.fileConfig && (
                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>Base Directory</div>
                    <div className='font-mono text-sm'>{storageStatus.fileConfig.baseDir}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      Directory Permissions
                    </div>
                    <div className='font-mono text-sm'>
                      {storageStatus.fileConfig.mkdirPermissions}
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      File Permissions
                    </div>
                    <div className='font-mono text-sm'>
                      {storageStatus.fileConfig.writePermissions}
                    </div>
                  </div>
                </div>
              )}

              {storageStatus.s3Config && (
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>S3 Bucket</div>
                    <div className='font-mono text-sm'>{storageStatus.s3Config.bucket}</div>
                  </div>
                  {storageStatus.s3Config.region && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>Region</div>
                      <div className='font-mono text-sm'>{storageStatus.s3Config.region}</div>
                    </div>
                  )}
                  {storageStatus.s3Config.endpoint && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>Endpoint</div>
                      <div className='font-mono text-sm'>{storageStatus.s3Config.endpoint}</div>
                    </div>
                  )}
                  {storageStatus.s3Config.baseDir && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>
                        Base Directory
                      </div>
                      <div className='font-mono text-sm'>{storageStatus.s3Config.baseDir}</div>
                    </div>
                  )}
                </div>
              )}
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

          {storageStatus?.isOverriddenByConfig && (
            <div className='text-sm text-orange-600 dark:text-orange-400'>
              This setting is overridden by configuration file or environment variable
            </div>
          )}

          <div className='flex justify-end pt-2'>
            <ButtonWithLoading
              onClick={() => setShowConfigDialog(true)}
              isLoading={false}
              disabled={storageStatus?.isOverriddenByConfig || false}
            >
              Configure Storage
            </ButtonWithLoading>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>Configure Storage</DialogTitle>
          </DialogHeader>
          <StorageConfigurationWizard
            title=''
            description=''
            onSuccess={handleStorageConfigured}
            onCancel={() => setShowConfigDialog(false)}
            showCancel={true}
            initialConfig={storageStatus}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
