import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveInvitation = vi.fn()

vi.mock('@/api/auth-api', () => ({
  resolveInvitation: (...args: any[]) => mockResolveInvitation(...args),
}))

describe('joinInviteLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a missing-token error when the invite token is blank', async () => {
    const { joinInviteLoader } = await import('./join-invite-loader')

    await expect(joinInviteLoader('   ')).resolves.toEqual({
      inviteToken: '',
      invitation: null,
      errorMessage: 'Invitation link is missing a token.',
      errorReason: 'invite_missing_token',
    })
  })

  it('resolves invitation metadata using the trimmed token', async () => {
    const { joinInviteLoader } = await import('./join-invite-loader')
    mockResolveInvitation.mockResolvedValue({
      organizationName: 'Acme Org',
      invitedEmail: 'owner@example.com',
      role: 'member',
      spaceName: 'Acme Space',
    })

    await expect(joinInviteLoader('  invite-token-123  ')).resolves.toEqual({
      inviteToken: 'invite-token-123',
      invitation: {
        organizationName: 'Acme Org',
        invitedEmail: 'owner@example.com',
        role: 'member',
        spaceName: 'Acme Space',
      },
      errorMessage: null,
      errorReason: null,
    })
    expect(mockResolveInvitation).toHaveBeenCalledWith('invite-token-123')
  })

  it('preserves backend error reasons when invitation resolution fails', async () => {
    const { joinInviteLoader } = await import('./join-invite-loader')
    mockResolveInvitation.mockRejectedValue({
      message: 'This invitation was sent to a different email address',
      reason: 'invite_email_mismatch',
    })

    await expect(joinInviteLoader('invite-token-123')).resolves.toEqual({
      inviteToken: 'invite-token-123',
      invitation: null,
      errorMessage: 'This invitation was sent to a different email address',
      errorReason: 'invite_email_mismatch',
    })
  })
})
