import { initializeCloudAuth as initializeCloudModeAuth } from '@/stores/auth/cloud'
import type { Auth } from '@/stores/auth/shared'

type Dispatch = Parameters<typeof initializeCloudModeAuth>[0]

export async function initializeCloudAuth(dispatch: Dispatch, accessToken?: string): Promise<Auth> {
  return initializeCloudModeAuth(dispatch, accessToken)
}
