import { checkFirstRun, guestLogin } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api.ts'
import { getToken, removeToken } from '@/lib/token'

import type { Auth } from '@/stores/auth/shared'
import { getOAuthCallbackToken } from '@/stores/auth/runtime'

type Dispatch = (action:
	| {
			type: 'INIT'
			payload: { accessToken: string; profile: NonNullable<Auth['profile']> }
	  }
	| { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean; multiTenant?: boolean } }
	| { type: 'SET_ERROR'; payload: { error: string } }
	| { type: 'LOGOUT' }) => Auth

export async function initializeSelfHostedAuth(dispatch: Dispatch, accessToken?: string): Promise<Auth> {
	try {
		const currentAccessToken = accessToken || getOAuthCallbackToken() || getToken()

		if (currentAccessToken) {
			const [profile, firstRunResponse] = await Promise.all([
				getCurrentUser(currentAccessToken),
				checkFirstRun().catch(() => null),
			])
			if (!profile) {
				throw new Error('Current user not found')
			}
			if (firstRunResponse) {
				dispatch({
					type: 'SET_FIRST_RUN',
					payload: {
						isFirstRun: firstRunResponse.isFirstRun,
						multiTenant: firstRunResponse.multiTenant,
					},
				})
			}
			return dispatch({
				type: 'INIT',
				payload: { accessToken: currentAccessToken, profile },
			})
		}

		let isFirstRun = false
		try {
			const firstRunResponse = await checkFirstRun()
			isFirstRun = firstRunResponse.isFirstRun
			dispatch({
				type: 'SET_FIRST_RUN',
				payload: { isFirstRun, multiTenant: firstRunResponse.multiTenant },
			})
		} catch {
			// ignore
		}

		if (!isFirstRun) {
			try {
				const guestResponse = await guestLogin()
				const profile = await getCurrentUser(guestResponse.token)
				if (!profile) {
					throw new Error('Guest profile not found')
				}
				return dispatch({
					type: 'INIT',
					payload: { accessToken: guestResponse.token, profile },
				})
			} catch {
				// ignore
			}
		}

		return dispatch({ type: 'LOGOUT' })
	} catch (error) {
		try {
			const firstRunResponse = await checkFirstRun()
			if (firstRunResponse.isFirstRun) {
				removeToken()
				dispatch({
					type: 'SET_FIRST_RUN',
					payload: { isFirstRun: true, multiTenant: firstRunResponse.multiTenant },
				})
				return dispatch({ type: 'LOGOUT' })
			}
		} catch {
			// ignore
		}
		const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
		dispatch({ type: 'SET_ERROR', payload: { error: errorMessage } })
		return dispatch({ type: 'LOGOUT' })
	}
}