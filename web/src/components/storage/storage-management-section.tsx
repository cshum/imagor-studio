import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StorageStatusQuery } from '@/generated/graphql'
import { loadRootFolders } from '@/stores/folder-tree-store'

import { StorageConfigurationWizard } from './storage-configuration-wizard'

interface StorageManagementSectionProps {
  storageStatus: StorageStatusQuery['storageStatus'] | null
}

export function StorageManagementSection({ storageStatus }: StorageManagementSectionProps) {
  const { t } = useTranslation()
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const router = useRouter()

  const handleStorageConfigured = async (restartRequired: boolean) => {
    setShowConfigDialog(false)
    if (restartRequired) {
      toast.success(t('pages.storage.configurationSuccessRestart'))
    } else {
      toast.success(t('pages.storage.configurationSuccess', { storageType: '' }))
      // Load root folders to refresh the folder tree with new storage configuration
      await loadRootFolders()
    }
    // Invalidate the loader data to get fresh storage status
    router.invalidate()
  }

  const getStorageTypeDisplay = (type: string | null) => {
    if (!type) return t('pages.storage.notConfigured')
    return type.toLowerCase() === 'file'
      ? t('pages.storage.fileStorage')
      : t('pages.storage.s3Storage')
  }

  const getStatusBadge = () => {
    if (!storageStatus?.configured)
      return <Badge variant='destructive'>{t('pages.storage.notConfigured')}</Badge>
    if (storageStatus.restartRequired)
      return <Badge variant='outline'>{t('pages.storage.restartRequired')}</Badge>
    return <Badge variant='default'>{t('pages.storage.active')}</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.admin.storage.title')}</CardTitle>
          <CardDescription>{t('pages.admin.storage.description')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.admin.storage.storageType')}
              </div>
              <div className='text-base'>{getStorageTypeDisplay(storageStatus?.type || null)}</div>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.admin.storage.status')}
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>

          {/* Display detailed configuration */}
          {storageStatus?.configured && (
            <div className='bg-muted/50 space-y-4 rounded-lg border p-4'>
              <div className='text-sm font-medium'>
                {t('pages.admin.storage.configurationDetails')}
              </div>

              {storageStatus.fileConfig && (
                <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.storage.baseDir')}
                    </div>
                    <div className='font-mono text-sm'>{storageStatus.fileConfig.baseDir}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.storage.directoryPermissions')}
                    </div>
                    <div className='font-mono text-sm'>
                      {storageStatus.fileConfig.mkdirPermissions}
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.storage.filePermissions')}
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
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.storage.s3Bucket')}
                    </div>
                    <div className='font-mono text-sm'>{storageStatus.s3Config.bucket}</div>
                  </div>
                  {storageStatus.s3Config.region && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>
                        {t('pages.storage.region')}
                      </div>
                      <div className='font-mono text-sm'>{storageStatus.s3Config.region}</div>
                    </div>
                  )}
                  {storageStatus.s3Config.endpoint && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>
                        {t('pages.storage.endpoint')}
                      </div>
                      <div className='font-mono text-sm'>{storageStatus.s3Config.endpoint}</div>
                    </div>
                  )}
                  {storageStatus.s3Config.baseDir && (
                    <div className='space-y-1'>
                      <div className='text-muted-foreground text-xs font-medium'>
                        {t('pages.storage.baseDirectory')}
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
                <strong>{t('pages.storage.serverRestartRequired')}</strong>{' '}
                {t('pages.storage.serverRestartMessage')}
              </div>
            </div>
          )}

          {storageStatus?.isOverriddenByConfig && (
            <div className='text-sm text-orange-600 dark:text-orange-400'>
              {t('pages.storage.configurationOverridden')}
            </div>
          )}

          <div className='flex justify-end pt-2'>
            <ButtonWithLoading
              onClick={() => setShowConfigDialog(true)}
              isLoading={false}
              disabled={storageStatus?.isOverriddenByConfig || false}
            >
              {t('pages.admin.storage.configureStorage')}
            </ButtonWithLoading>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('pages.storage.configureStorage')}</DialogTitle>
          </DialogHeader>
          <StorageConfigurationWizard
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
