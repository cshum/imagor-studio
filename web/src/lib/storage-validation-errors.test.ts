import type { TFunction } from 'i18next'
import { describe, expect, it } from 'vitest'

import { formatStorageValidationError } from './storage-validation-errors'

const t = ((key: string) => key) as unknown as TFunction

describe('storage-validation-errors', () => {
  it('prefers backend codes over message string matching', () => {
    const result = formatStorageValidationError(t, {
      code: 'S3_INVALID_REGION',
      message: 'Failed to access storage directory',
      details: 'raw backend detail that should not be shown',
    })

    expect(result).toBe('pages.storage.validationErrors.invalidRegion')
  })

  it('falls back to detail matching for older servers without codes', () => {
    const result = formatStorageValidationError(t, {
      message: 'Failed to access storage directory',
      details: 'api error AccessDenied: Access Denied',
    })

    expect(result).toBe('pages.storage.validationErrors.accessDenied')
  })

  it('matches wrapped R2 invalid region errors without backend codes', () => {
    const result = formatStorageValidationError(t, {
      message:
        "Failed to create space: invalid BYOB storage configuration: Failed to access storage directory: operation error S3: ListObjectsV2, https response error StatusCode: 400, api error InvalidRegionName: The region name 'adfdas' is not valid. Must be one of: wnam, enam, weur, eeur, apac, oc, auto",
    })

    expect(result).toBe('pages.storage.validationErrors.invalidRegion')
  })
})
