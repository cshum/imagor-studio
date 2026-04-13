import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StorageStatusQuery } from '@/generated/graphql'

import { StorageConfigurationWizard } from './storage-configuration-wizard'

/** Banner display window in seconds — worst-case propagation time across all replicas. */
const SYNC_INTERVAL_S = 60

/** Returns the number of seconds remaining until the 30-second sync loop is expected to
 *  have applied the last config change on all instances. Returns 0 when propagation is
 *  complete (or if `lastUpdated` is absent / already past the window). */
function calcRemaining(lastUpdated: string | null | undefined): number {
  if (!lastUpdated) return 0
  const updatedMs = parseInt(lastUpdated, 10)
  if (isNaN(updatedMs)) return 0
  const elapsed = Math.floor((Date.now() - updatedMs) / 1000)
  return Math.max(0, SYNC_INTERVAL_S - elapsed)
}

interface StorageManagementSectionProps {
  storageStatus: StorageStatusQuery['storageStatus'] | null
}

export function StorageManagementSection({ storageStatus }: StorageManagementSectionProps) {
  const { t } = useTranslation()
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const router = useRouter()

  // Initialize the countdown from the server-supplied lastUpdated timestamp.
  // This means the banner reappears even on a hard-refresh if the window hasn't elapsed yet.
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calcRemaining(storageStatus?.lastUpdated),
  )

  // Keep a stable ref so the interval callback can call router.invalidate() without
  // capturing a stale closure.
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const initial = calcRemaining(storageStatus?.lastUpdated)
    setRemainingSeconds(initial)
    if (initial <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Propagation window elapsed — refresh the displayed config.
          routerRef.current.invalidate()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [storageStatus?.lastUpdated])

  const handleStorageConfigured = () => {
    setShowConfigDialog(false)
    toast.success(t('pages.storage.configurationSuccess'))
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

          {/* Propagation countdown banner */}
          {remainingSeconds > 0 && (
            <div className='flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'>
              <span className='inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500' />
              {t('pages.storage.takingEffect')}
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
