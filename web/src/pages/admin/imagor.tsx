import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { configureImagor } from '@/api/imagor-api'
import { ImagorConfigForm, type ImagorConfigValues } from '@/components/imagor/imagor-config-form'
import { ImagorUrlSigningDescription } from '@/components/imagor/imagor-url-signing-description'
import { SystemSettingsForm, type SystemSetting } from '@/components/system-settings-form'
import type { AdminImagorLoaderData } from '@/loaders/account-loader'

// ── Propagation countdown helper ───────────────────────────────────────────

const SYNC_INTERVAL_S = 60

function calcRemaining(lastUpdated: string | null | undefined): number {
  if (!lastUpdated) return 0
  const updatedMs = parseInt(lastUpdated, 10)
  if (isNaN(updatedMs)) return 0
  const elapsed = Math.floor((Date.now() - updatedMs) / 1000)
  return Math.max(0, SYNC_INTERVAL_S - elapsed)
}

// ── Props ──────────────────────────────────────────────────────────────────

interface AdminImagorSectionProps {
  loaderData: AdminImagorLoaderData
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminImagorSection({ loaderData }: AdminImagorSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { imagorStatus } = loaderData

  const mediaSettings: SystemSetting[] = [
    {
      key: 'config.app_video_thumbnail_position',
      type: 'select',
      label: t('pages.admin.systemSettings.fields.videoThumbnailPosition.label'),
      description: t('pages.admin.systemSettings.fields.videoThumbnailPosition.description'),
      defaultValue: 'first_frame',
      options: ['first_frame', 'seek_1s', 'seek_3s', 'seek_5s', 'seek_10pct', 'seek_25pct'],
      optionLabels: {
        first_frame: t(
          'pages.admin.systemSettings.fields.videoThumbnailPosition.options.firstFrame',
        ),
        seek_1s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek1s'),
        seek_3s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek3s'),
        seek_5s: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek5s'),
        seek_10pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek10pct'),
        seek_25pct: t('pages.admin.systemSettings.fields.videoThumbnailPosition.options.seek25pct'),
      },
    },
  ]

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calcRemaining(imagorStatus?.lastUpdated),
  )
  const routerRef = useRef(router)
  routerRef.current = router

  useEffect(() => {
    const initial = calcRemaining(imagorStatus?.lastUpdated)
    setRemainingSeconds(initial)
    if (initial <= 0) return
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          routerRef.current.invalidate()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [imagorStatus?.lastUpdated])

  const isOverridden = imagorStatus?.isOverriddenByConfig ?? false

  const handleSave = async (values: ImagorConfigValues) => {
    const result = await configureImagor({
      input: {
        secret: values.secret?.trim() || null,
        signerType: values.signerType,
        signerTruncate: values.signerTruncate,
      },
    })
    if (!result.success) {
      throw new Error(result.message || t('pages.imagor.configurationError'))
    }
    toast.success(t('pages.imagor.configuredSuccess'))
    setRemainingSeconds(SYNC_INTERVAL_S)
    await router.invalidate()
  }

  return (
    <div className='space-y-4'>
      {/* Override warning */}
      {isOverridden && (
        <p className='text-sm text-orange-600 dark:text-orange-400'>
          {t('pages.imagor.configurationOverridden')}
        </p>
      )}

      <ImagorConfigForm
        initialValues={{
          hasSecret: imagorStatus?.config?.hasSecret ?? false,
          signerType: imagorStatus?.config?.signerType,
          signerTruncate: imagorStatus?.config?.signerTruncate,
        }}
        title={t('pages.spaceSettings.imagor.urlSigning')}
        description={<ImagorUrlSigningDescription />}
        onSave={handleSave}
        disabled={isOverridden}
      />

      <SystemSettingsForm
        title={t('pages.admin.imagor.media', { defaultValue: 'Media' })}
        description={t('pages.admin.imagor.mediaDescription', {
          defaultValue: 'Control how video thumbnails are generated across the instance.',
        })}
        settings={mediaSettings}
        initialValues={loaderData.registry}
        systemRegistryList={loaderData.systemRegistryList}
      />

      {/* Propagation countdown */}
      {remainingSeconds > 0 && (
        <p className='text-muted-foreground text-sm'>
          {t('pages.imagor.takingEffect')} ({remainingSeconds}s)
        </p>
      )}
    </div>
  )
}
