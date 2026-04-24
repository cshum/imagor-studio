import { useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { setSpaceRegistryObject } from '@/api/org-api'
import { extractErrorInfo } from '@/lib/error-utils'

const CUSTOM_DOMAIN_FEEDBACK_REQUESTED_AT_KEY = 'feedback.custom_domain_interest_at'
const CUSTOM_DOMAIN_FEEDBACK_SOURCE_KEY = 'feedback.custom_domain_interest_source'
const CUSTOM_DOMAIN_FEEDBACK_SOURCE = 'space-settings-general'

const formatFeedbackDate = (value?: string) => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toLocaleDateString()
}

interface UseCustomDomainBetaInterestOptions {
  spaceId: string
  initialValues: Record<string, string>
  onSuccessMessage: string
}

export function useCustomDomainBetaInterest({
  spaceId,
  initialValues,
  onSuccessMessage,
}: UseCustomDomainBetaInterestOptions) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const requestedAt = initialValues[CUSTOM_DOMAIN_FEEDBACK_REQUESTED_AT_KEY] ?? ''
  const formattedRequestedAt = useMemo(() => formatFeedbackDate(requestedAt), [requestedAt])

  const recordInterest = async () => {
    setIsSaving(true)
    try {
      await setSpaceRegistryObject(spaceId, {
        [CUSTOM_DOMAIN_FEEDBACK_REQUESTED_AT_KEY]: new Date().toISOString(),
        [CUSTOM_DOMAIN_FEEDBACK_SOURCE_KEY]: CUSTOM_DOMAIN_FEEDBACK_SOURCE,
      })
      toast.success(onSuccessMessage)
      await router.invalidate()
    } catch (err) {
      toast.error(extractErrorInfo(err).message)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    formattedRequestedAt,
    hasRequestedInterest: Boolean(requestedAt),
    isSaving,
    recordInterest,
    requestedAt,
  }
}
