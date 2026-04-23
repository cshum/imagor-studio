import type { TFunction } from 'i18next'

type StorageResultLike = {
  message?: string | null
  details?: string | null
  code?: string | null
}

function translateStorageValidationCode(t: TFunction, code?: string | null): string | null {
  switch ((code ?? '').trim()) {
    case 'S3_ENDPOINT_UNREACHABLE':
      return t('pages.storage.validationErrors.endpointUnreachable')
    case 'S3_INVALID_ACCESS_KEY':
      return t('pages.storage.validationErrors.invalidAccessKey')
    case 'S3_INVALID_REGION':
      return t('pages.storage.validationErrors.invalidRegion')
    case 'S3_ACCESS_DENIED':
      return t('pages.storage.validationErrors.accessDenied')
    case 'S3_AUTHENTICATION_FAILED':
      return t('pages.storage.validationErrors.authentication')
    case 'S3_TIMEOUT':
      return t('pages.storage.validationErrors.timeout')
    case 'S3_CORS_PROBE_FAILED':
      return t('pages.storage.validationErrors.cors')
    default:
      return null
  }
}

function normalize(value?: string | null): string {
  return (value ?? '').trim().toLowerCase()
}

function translateStorageValidationText(t: TFunction, text?: string | null): string | null {
  const normalized = normalize(text)
  if (!normalized) {
    return null
  }

  if (
    normalized.includes('unable to reach the s3 endpoint') ||
    normalized.includes('no such host')
  ) {
    return t('pages.storage.validationErrors.endpointUnreachable')
  }

  if (
    normalized.includes('access key id format is invalid') ||
    normalized.includes('credential access key has length')
  ) {
    return t('pages.storage.validationErrors.invalidAccessKey')
  }

  if (
    normalized.includes('region is invalid') ||
    normalized.includes('invalid input region') ||
    normalized.includes('invalidregionname') ||
    (normalized.includes('region name') && normalized.includes('must be one of'))
  ) {
    return t('pages.storage.validationErrors.invalidRegion')
  }

  if (normalized.includes('access denied')) {
    return t('pages.storage.validationErrors.accessDenied')
  }

  if (normalized.includes('unable to authenticate to s3')) {
    return t('pages.storage.validationErrors.authentication')
  }

  if (
    normalized.includes('timed out connecting to s3') ||
    normalized.includes('context deadline exceeded')
  ) {
    return t('pages.storage.validationErrors.timeout')
  }

  if (normalized.includes('browser upload probe failed')) {
    return t('pages.storage.validationErrors.cors')
  }

  return null
}

export function formatStorageValidationError(t: TFunction, result: StorageResultLike): string {
  const translatedCode = translateStorageValidationCode(t, result.code)
  if (translatedCode) {
    return translatedCode
  }

  const translatedDetails = translateStorageValidationText(t, result.details)
  if (translatedDetails) {
    return translatedDetails
  }

  const translatedMessage = translateStorageValidationText(t, result.message)
  if (translatedMessage) {
    return translatedMessage
  }

  if (result.details?.trim()) {
    return result.message?.trim()
      ? `${result.message.trim()}: ${result.details.trim()}`
      : result.details.trim()
  }

  return result.message?.trim() || t('pages.storage.testFailed')
}
