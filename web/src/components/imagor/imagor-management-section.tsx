import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

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
