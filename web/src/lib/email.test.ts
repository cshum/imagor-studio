import { describe, expect, it } from 'vitest'

import { isValidEmail, normalizeEmail } from '@/lib/email'

describe('email utils', () => {
  it('accepts valid email addresses after trimming', () => {
    expect(isValidEmail(' user@example.com ')).toBe(true)
  })

  it('rejects invalid email addresses', () => {
    expect(isValidEmail('not-an-email')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })

  it('normalizes by trimming surrounding whitespace', () => {
    expect(normalizeEmail(' user@example.com ')).toBe('user@example.com')
  })
})
