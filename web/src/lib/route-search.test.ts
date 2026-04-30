import { describe, expect, it } from 'vitest'

import { getInviteTokenSearchValue } from './route-search'

describe('getInviteTokenSearchValue', () => {
  it('returns undefined when invite_token is missing', () => {
    expect(getInviteTokenSearchValue({})).toBeUndefined()
  })

  it('returns the token when invite_token is present', () => {
    expect(getInviteTokenSearchValue({ invite_token: 'invite-token-123' })).toBe(
      'invite-token-123',
    )
  })
})