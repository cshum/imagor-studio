import { describe, expect, it } from 'vitest'

import { extractErrorInfo, extractErrorMessage } from './error-utils'

describe('error-utils', () => {
  it('sanitizes graphql-request dump-style messages', () => {
    const error = {
      message:
        'GraphQL Error (Code: 400): {"response":{"status":400,"headers":{}},"request":{"query":"mutation Foo { foo }"}}',
      response: {
        status: 400,
        headers: {},
      },
    }

    expect(extractErrorMessage(error)).toBe('GraphQL request failed with status 400')
    expect(extractErrorInfo(error)).toEqual({
      message: 'GraphQL request failed with status 400',
    })
  })

  it('prefers GraphQL error messages when present', () => {
    const error = {
      response: {
        status: 200,
        errors: [
          {
            message: 'Space key already taken',
            extensions: { field: 'key', code: 'BAD_USER_INPUT' },
          },
        ],
      },
    }

    expect(extractErrorMessage(error)).toBe('Space key already taken')
    expect(extractErrorInfo(error)).toEqual({
      message: 'Space key already taken',
      field: 'key',
      code: 'BAD_USER_INPUT',
      reason: undefined,
      argumentName: undefined,
    })
  })

  it('extracts graphql error reasons when present', () => {
    const error = {
      response: {
        status: 200,
        errors: [
          {
            message: 'Space limit reached',
            extensions: { code: 'INVALID_INPUT', reason: 'space_limit_reached' },
          },
        ],
      },
    }

    expect(extractErrorInfo(error)).toEqual({
      message: 'Space limit reached',
      field: undefined,
      code: 'INVALID_INPUT',
      reason: 'space_limit_reached',
      argumentName: undefined,
    })
  })
})
