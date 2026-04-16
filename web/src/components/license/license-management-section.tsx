import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'

import type { LicenseStatus } from '@/api/license-api'
import { ButtonWithLoading } from '@/components/ui/button-with-loading'
import { SettingRow } from '@/components/ui/setting-row'
import { SettingsSection } from '@/components/ui/settings-section'

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

  if (!licenseStatus) {
    return (
      <SettingsSection>
        <SettingRow label={t('pages.license.licenseManagement')} last>
          <p className='text-muted-foreground text-sm'>{t('pages.license.unableToLoad')}</p>
        </SettingRow>
      </SettingsSection>
    )
  }

  const isLicensed = licenseStatus.isLicensed
  const isOverridden = licenseStatus.isOverriddenByConfig

  return (
    <>
      <SettingsSection>
        <SettingRow
          label={t('pages.license.licenseType')}
          contentClassName='flex items-center justify-end'
        >
          {isLicensed ? (
            <p className='text-sm font-medium'>
              {getLicenseTypeDisplay(licenseStatus.licenseType)}
            </p>
          ) : (
            <p className='text-muted-foreground text-sm'>{t('pages.license.notLicensed')}</p>
          )}
        </SettingRow>

        {isLicensed && licenseStatus.email && (
          <SettingRow label={t('pages.license.licensedTo')} contentClassName='flex justify-end'>
            <p className='text-sm'>{licenseStatus.email}</p>
          </SettingRow>
        )}

        {isLicensed && licenseStatus.activatedAt && (
          <SettingRow label={t('pages.license.activatedOn')} contentClassName='flex justify-end'>
            <p className='text-sm'>{licenseStatus.activatedAt}</p>
          </SettingRow>
        )}

        {isLicensed && licenseStatus.maskedLicenseKey && (
          <SettingRow label={t('pages.license.licenseKey')} contentClassName='flex justify-end'>
            <p className='font-mono text-sm'>{licenseStatus.maskedLicenseKey}</p>
          </SettingRow>
        )}

        {isOverridden && (
          <SettingRow
            label={t('pages.license.configurationOverridden')}
            className='text-orange-600 dark:text-orange-400'
            contentClassName='flex justify-end'
          >
            <span />
          </SettingRow>
        )}

        {!isLicensed && licenseStatus.supportMessage && (
          <SettingRow label={t('pages.license.supportDevelopment')}>
            <p className='text-muted-foreground text-sm'>{licenseStatus.supportMessage}</p>
          </SettingRow>
        )}

        <SettingRow last contentClassName='flex justify-end gap-3'>
          {!isLicensed && (
            <ButtonWithLoading
              variant='outline'
              onClick={() => {
                window.open('https://imagor.net/buy/early-bird/', '_blank')
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
        </SettingRow>
      </SettingsSection>

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
