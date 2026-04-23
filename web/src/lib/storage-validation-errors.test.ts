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
})
