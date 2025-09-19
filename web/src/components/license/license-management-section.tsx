import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'

import type { LicenseStatus } from '@/api/license-api'
import { Badge } from '@/components/ui/badge'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { LicenseUpdateDialog } from './license-update-dialog'

interface LicenseManagementSectionProps {
  licenseStatus: LicenseStatus | null
}

export function LicenseManagementSection({ licenseStatus }: LicenseManagementSectionProps) {
  const { t } = useTranslation()
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const router = useRouter()

  const handleUpdateSuccess = async () => {
    setShowUpdateDialog(false)
    // Refresh the page data after successful license update
    await router.invalidate()
  }

  const getLicenseTypeDisplay = (licenseType: string | undefined) => {
    if (!licenseType) return t('pages.license.notLicensed')

    const typeKey = `pages.license.licenseTypes.${licenseType}` as const
    return t(typeKey, { defaultValue: licenseType.charAt(0).toUpperCase() + licenseType.slice(1) })
  }

  const getStatusBadge = () => {
    if (!licenseStatus?.isLicensed) {
      return <Badge variant='destructive'>{t('pages.license.notLicensed')}</Badge>
    }
    return <Badge variant='default'>{t('pages.license.licensed')}</Badge>
  }

  if (!licenseStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.license.licenseManagement')}</CardTitle>
          <CardDescription>Unable to load license information</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const isLicensed = licenseStatus.isLicensed
  const isOverridden = licenseStatus.isOverriddenByConfig

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('pages.license.licenseManagement')}</CardTitle>
          <CardDescription>{t('pages.license.licenseManagementDescription')}</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.license.licenseType')}
              </div>
              <div className='text-base'>{getLicenseTypeDisplay(licenseStatus.licenseType)}</div>
            </div>

            <div className='space-y-2'>
              <div className='text-muted-foreground text-sm font-medium'>
                {t('pages.license.status')}
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>

          {/* Display detailed configuration */}
          {isLicensed && (
            <div className='bg-muted/50 space-y-4 rounded-lg border p-4'>
              <div className='text-sm font-medium'>{t('pages.license.configurationDetails')}</div>

              {/* 3-Column License Details */}
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {licenseStatus.email && (
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.license.licensedTo')}
                    </div>
                    <div className='text-sm'>{licenseStatus.email}</div>
                  </div>
                )}
                {licenseStatus.activatedAt && (
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.license.activatedOn')}
                    </div>
                    <div className='text-sm'>{licenseStatus.activatedAt}</div>
                  </div>
                )}
                {licenseStatus.maskedLicenseKey && (
                  <div className='space-y-1'>
                    <div className='text-muted-foreground text-xs font-medium'>
                      {t('pages.license.licenseKey')}
                    </div>
                    <div className='font-mono text-sm'>{licenseStatus.maskedLicenseKey}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isOverridden && (
            <div className='text-sm text-orange-600 dark:text-orange-400'>
              {t('pages.license.configurationOverridden')}
            </div>
          )}

          {/* Support Information for Unlicensed */}
          {!isLicensed && licenseStatus.supportMessage && (
            <div className='rounded-md bg-blue-50 p-4 dark:bg-blue-900/20'>
              <h4 className='mb-2 font-medium text-blue-900 dark:text-blue-400'>
                {t('pages.license.supportDevelopment')}
              </h4>
              <p className='text-sm text-blue-800 dark:text-blue-300'>
                {licenseStatus.supportMessage}
              </p>
            </div>
          )}

          <div className='flex justify-end pt-2'>
            <div className='flex gap-3'>
              {!isLicensed && (
                <ButtonWithLoading
                  variant='outline'
                  onClick={() => {
                    window.open('https://buy.imagor-studio.com', '_blank')
                  }}
                  isLoading={false}
                >
                  {t('pages.license.purchaseLicense')}
                </ButtonWithLoading>
              )}
              <ButtonWithLoading
                onClick={() => setShowUpdateDialog(true)}
                isLoading={false}
                disabled={isOverridden}
              >
                {isLicensed ? t('pages.license.updateLicense') : t('pages.license.activateLicense')}
              </ButtonWithLoading>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* License Update Dialog */}
      <LicenseUpdateDialog
        open={showUpdateDialog}
        onOpenChange={setShowUpdateDialog}
        currentLicenseType={isLicensed ? licenseStatus.licenseType || undefined : undefined}
        currentMaskedKey={isLicensed ? licenseStatus.maskedLicenseKey || undefined : undefined}
        onSuccess={handleUpdateSuccess}
      />
    </>
  )
}
