import type { Auth } from '@/stores/auth/shared'
import { initializeSelfHostedAuth } from '@/stores/auth/selfhosted'

type Dispatch = (action:
	| {
			type: 'INIT'
			payload: { accessToken: string; profile: NonNullable<Auth['profile']> }
	  }
	| { type: 'SET_FIRST_RUN'; payload: { isFirstRun: boolean; multiTenant?: boolean } }
	| { type: 'SET_ERROR'; payload: { error: string } }
	| { type: 'LOGOUT' }) => Auth

// Cloud currently reuses the same bootstrap behavior while the store still exposes multiTenant.
// This module exists to give the cloud path its own seam for future divergence.
export async function initializeCloudAuth(dispatch: Dispatch, accessToken?: string): Promise<Auth> {
	return initializeSelfHostedAuth(dispatch, accessToken)
}