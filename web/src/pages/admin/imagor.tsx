import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { configureImagor } from '@/api/imagor-api'
import { ImagorConfigForm, type ImagorConfigValues } from '@/components/imagor/imagor-config-form'
import type { ImagorStatusQuery } from '@/generated/graphql'

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
  imagorStatus: ImagorStatusQuery['imagorStatus'] | null
}

// ── Component ──────────────────────────────────────────────────────────────

export function AdminImagorSection({ imagorStatus }: AdminImagorSectionProps) {
  const { t } = useTranslation()
  const router = useRouter()

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
        onSave={handleSave}
        disabled={isOverridden}
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
