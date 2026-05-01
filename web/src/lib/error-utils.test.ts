import { describe, expect, it } from 'vitest'

import { extractErrorInfo, extractErrorMessage, isOrganizationRequiredError } from './error-utils'

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

  it('sanitizes Stripe-like secrets and request log URLs in GraphQL messages', () => {
    const error = {
      response: {
        status: 200,
        errors: [
          {
            message:
              'failed to create billing portal session: create stripe billing portal session: {"status":403,"message":"The provided key \"rk_test_1234567890abcdef\" does not have the required permissions","request_log_url":"https://dashboard.stripe.com/acct_123/test/workbench/logs?object=req_123","type":"invalid_request_error"}',
          },
        ],
      },
    }

    expect(extractErrorMessage(error)).toBe('Billing provider request failed. Please try again.')
    expect(extractErrorInfo(error)).toEqual({
      message: 'Billing provider request failed. Please try again.',
      field: undefined,
      code: undefined,
      reason: undefined,
      argumentName: undefined,
    })
  })

  it('sanitizes Stripe-like secrets in direct error messages', () => {
    const error = {
      message:
        'The provided key rk_test_1234567890abcdef does not have the required permissions. request_log_url=https://dashboard.stripe.com/acct_123/test/workbench/logs?object=req_123',
    }

    expect(extractErrorMessage(error)).toBe('Billing provider request failed. Please try again.')
    expect(extractErrorInfo(error)).toEqual({
      message: 'Billing provider request failed. Please try again.',
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

  it('detects organization_required errors', () => {
    const error = {
      response: {
        status: 200,
        errors: [
          {
            message: 'Organization is required',
            extensions: { code: 'INVALID_INPUT', reason: 'organization_required' },
          },
        ],
      },
    }

    expect(isOrganizationRequiredError(error)).toBe(true)
  })
})
