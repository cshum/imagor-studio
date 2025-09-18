import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ImagorStatusQuery } from '@/generated/graphql'

import { ImagorConfigurationWizard } from './imagor-configuration-wizard'

interface ImagorManagementSectionProps {
  imagorStatus: ImagorStatusQuery['imagorStatus'] | null
}

export function ImagorManagementSection({ imagorStatus }: ImagorManagementSectionProps) {
  const { t } = useTranslation()
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const router = useRouter()

  const handleImagorConfigured = (restartRequired: boolean) => {
    setShowConfigDialog(false)
    if (restartRequired) {
      toast.success(t('pages.imagor.configuredSuccessRestart'))
    } else {
      toast.success(t('pages.imagor.configuredSuccess'))
    }
    // Invalidate the loader data to get fresh imagor status
    router.invalidate()
  }

  const getModeDisplay = (mode: string | null) => {
    if (!mode) return t('pages.imagor.notConfigured')
    return mode === 'EMBEDDED' ? t('pages.imagor.embeddedMode') : t('pages.imagor.externalMode')
  }

  const getStatusBadge = () => {
    if (!imagorStatus?.configured)
      return <Badge variant='destructive'>{t('pages.imagor.notConfigured')}</Badge>
    if (imagorStatus.restartRequired)
      return <Badge variant='outline'>{t('pages.imagor.restartRequired')}</Badge>
    return <Badge variant='default'>{t('pages.imagor.active')}</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.imagor.imagorConfiguration')}</CardTitle>
          <CardDescription>{t('pages.imagor.imagorConfigurationDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.imagor.mode')}
              </div>
              <div className='text-base'>{getModeDisplay(imagorStatus?.mode || null)}</div>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.imagor.status')}
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>

          {/* Display detailed configuration */}
          {imagorStatus?.configured && (
            <div className='bg-muted/50 space-y-4 rounded-lg border p-4'>
              <div className='text-sm font-medium'>{t('pages.imagor.configurationDetails')}</div>

              {imagorStatus.mode === 'EMBEDDED' && (
                <div className='text-muted-foreground text-sm'>
                  {t('pages.imagor.embeddedModeSimplified')}
                </div>
              )}

              {imagorStatus.externalConfig && imagorStatus.mode === 'EXTERNAL' && (
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.imagor.baseUrl')}
                    </div>
                    <div className='font-mono text-sm'>{imagorStatus.externalConfig.baseUrl}</div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.imagor.hasSecret')}
                    </div>
                    <div className='font-mono text-sm'>
                      {imagorStatus.externalConfig.hasSecret
                        ? t('common.status.yes')
                        : t('common.status.no')}
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.imagor.unsafeMode')}
                    </div>
                    <div className='font-mono text-sm'>
                      {imagorStatus.externalConfig.unsafe
                        ? t('common.status.enabled')
                        : t('common.status.disabled')}
                    </div>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.imagor.signerType')}
                    </div>
                    <div className='font-mono text-sm'>
                      {imagorStatus.externalConfig.signerType}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {imagorStatus?.restartRequired && (
            <div className='rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950'>
              <div className='text-sm text-orange-800 dark:text-orange-200'>
                <strong>{t('pages.imagor.serverRestartRequired')}:</strong>{' '}
                {t('pages.imagor.serverRestartDescription')}
              </div>
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
