import { resolveInvitation, type AuthApiError, type InvitationResolutionResponse } from '@/api/auth-api'

export interface JoinInviteLoaderData {
  inviteToken: string
  invitation: InvitationResolutionResponse | null
  errorMessage: string | null
  errorReason: string | null
}

export async function joinInviteLoader(inviteToken: string): Promise<JoinInviteLoaderData> {
  const normalizedToken = inviteToken.trim()
  if (!normalizedToken) {
    return {
      inviteToken: '',
      invitation: null,
      errorMessage: 'Invitation link is missing a token.',
      errorReason: 'invite_missing_token',
    }
  }

  try {
    const invitation = await resolveInvitation(normalizedToken)
    return {
      inviteToken: normalizedToken,
      invitation,
      errorMessage: null,
      errorReason: null,
    }
  } catch (error) {
    const apiError = error as AuthApiError
    return {
      inviteToken: normalizedToken,
      invitation: null,
      errorMessage: apiError.message || 'Invitation is no longer valid.',
      errorReason: apiError.reason || null,
    }
  }
}