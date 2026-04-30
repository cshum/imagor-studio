import { describe, expect, it } from 'vitest'

import { appendSearchParams, getInviteTokenSearchValue } from './route-search'

describe('getInviteTokenSearchValue', () => {
  it('returns undefined when invite_token is missing', () => {
    expect(getInviteTokenSearchValue({})).toBeUndefined()
  })

  it('returns the token when invite_token is present', () => {
    expect(getInviteTokenSearchValue({ invite_token: 'invite-token-123' })).toBe('invite-token-123')
  })
})

describe('appendSearchParams', () => {
  it('returns the pathname when there are no serializable search params', () => {
    expect(appendSearchParams('/login', { ignored: { nested: true }, empty: undefined })).toBe(
      '/login',
    )
  })

  it('serializes primitive and array search values', () => {
    expect(
      appendSearchParams('/editor/new', {
        template: 'social',
        page: 2,
        draft: true,
        tags: ['hero', 'feed'],
      }),
    ).toBe('/editor/new?template=social&page=2&draft=true&tags=hero&tags=feed')
  })
})
