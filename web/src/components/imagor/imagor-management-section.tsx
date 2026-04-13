import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ImagorStatusQuery } from '@/generated/graphql'

import { ImagorConfigurationWizard } from './imagor-configuration-wizard'

/** Sync loop interval in seconds — must match server/server.go startSyncLoop interval. */
const SYNC_INTERVAL_S = 30

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

interface ImagorManagementSectionProps {
  imagorStatus: ImagorStatusQuery['imagorStatus'] | null
}

export function ImagorManagementSection({ imagorStatus }: ImagorManagementSectionProps) {
  const { t } = useTranslation()
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const router = useRouter()

  // Initialize the countdown from the server-supplied lastUpdated timestamp.
  // This means the banner reappears even on a hard-refresh if the window hasn't elapsed yet.
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calcRemaining(imagorStatus?.lastUpdated),
  )

  // Keep a stable ref so the interval callback can call router.invalidate() without
  // capturing a stale closure.
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const initial = calcRemaining(imagorStatus?.lastUpdated)
    setRemainingSeconds(initial)
    if (initial <= 0) return

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
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
  }, [imagorStatus?.lastUpdated])

  const handleImagorConfigured = () => {
    setShowConfigDialog(false)
    toast.success(t('pages.imagor.configuredSuccess'))
    router.invalidate()
  }

  const config = imagorStatus?.config

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.imagor.imagorConfiguration')}</CardTitle>
          <CardDescription>{t('pages.imagor.imagorConfigurationDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Display embedded configuration details */}
          {imagorStatus?.configured && config && (
            <div className='bg-muted/50 space-y-4 rounded-lg border p-4'>
              <div className='text-sm font-medium'>{t('pages.imagor.configurationDetails')}</div>
              <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                <div className='space-y-1'>
                  <div className='text-muted-foreground text-xs font-medium'>
                    {t('pages.imagor.hasSecret')}
                  </div>
                  <div className='font-mono text-sm'>
                    {config.hasSecret ? t('common.status.yes') : t('common.status.no')}
                  </div>
                </div>
                <div className='space-y-1'>
                  <div className='text-muted-foreground text-xs font-medium'>
                    {t('pages.imagor.signerType')}
                  </div>
                  <div className='font-mono text-sm'>{config.signerType}</div>
                </div>
                {config.signerTruncate > 0 && (
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.imagor.signerTruncate')}
                    </div>
                    <div className='font-mono text-sm'>{config.signerTruncate}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Propagation countdown banner */}
          {remainingSeconds > 0 && (
            <div className='flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'>
              <span className='inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500' />
              {t('pages.imagor.takingEffect', { seconds: remainingSeconds })}
            </div>
          )}

          {imagorStatus?.isOverriddenByConfig && (
            <div className='text-sm text-orange-600 dark:text-orange-400'>
              {t('pages.imagor.configurationOverridden')}
            </div>
          )}

          <div className='flex justify-end pt-2'>
            <ButtonWithLoading
              onClick={() => setShowConfigDialog(true)}
              isLoading={false}
              disabled={imagorStatus?.isOverriddenByConfig || false}
            >
              {t('pages.imagor.configureImagor')}
            </ButtonWithLoading>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className='max-h-[90vh] max-w-4xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{t('pages.imagor.configureImagor')}</DialogTitle>
          </DialogHeader>
          <ImagorConfigurationWizard
            onSuccess={handleImagorConfigured}
            onCancel={() => setShowConfigDialog(false)}
            showCancel={true}
            initialConfig={imagorStatus}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
