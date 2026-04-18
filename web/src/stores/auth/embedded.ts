import { embeddedGuestLogin } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api.ts'
import i18n from '@/i18n'

import type { Auth } from '@/stores/auth/shared'

export async function initializeEmbeddedAuth(
	dispatch: (action: {
		type: 'INIT'
		payload: {
			accessToken: string
			profile: NonNullable<Auth['profile']>
			isEmbedded?: boolean
			pathPrefix?: string
		}
	}) => Auth,
): Promise<Auth> {
	const urlParams = new URLSearchParams(window.location.search)
	const token = urlParams.get('token')

	if (!token) {
		throw new Error(i18n.t('auth.embedded.tokenMissing'))
	}

	try {
		const response = await embeddedGuestLogin(token)
		const profile = await getCurrentUser(response.token)
		if (!profile) {
			throw new Error(i18n.t('auth.embedded.authenticationFailed'))
		}

		return dispatch({
			type: 'INIT',
			payload: {
				accessToken: response.token,
				profile,
				isEmbedded: true,
				pathPrefix: response.pathPrefix || '',
			},
		})
	} catch (error) {
		if (error instanceof Error) {
			const errorMessage = error.message.toLowerCase()
			if (
				errorMessage.includes('invalid') ||
				errorMessage.includes('expired') ||
				errorMessage.includes('unauthorized')
			) {
				throw new Error(i18n.t('auth.embedded.tokenInvalid'))
			}
		}
		throw new Error(i18n.t('auth.embedded.authenticationFailed'))
	}
}