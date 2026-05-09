import { getBaseUrl } from '@/lib/api-utils'
import { getAuth } from '@/stores/auth-store'

export interface PreviewSession {
  token: string
  expiresAt: number
  processingOrigin: string
}

interface PreviewSessionOptions {
  signal?: AbortSignal
  forceRefresh?: boolean
}

const previewSessions = new Map<string, PreviewSession>()
const pendingPreviewSessions = new Map<string, Promise<PreviewSession>>()
const PREVIEW_REFRESH_WINDOW_MS = 90_000

function shouldRefreshSession(session: PreviewSession | undefined): boolean {
  if (!session) {
    return true
  }
  return Date.now() >= session.expiresAt - PREVIEW_REFRESH_WINDOW_MS
}

export function clearPreviewSession(spaceID?: string): void {
  if (spaceID) {
    previewSessions.delete(spaceID)
    pendingPreviewSessions.delete(spaceID)
    return
  }
  previewSessions.clear()
  pendingPreviewSessions.clear()
}

export async function getPreviewSession(
  spaceID: string,
  options: PreviewSessionOptions = {},
): Promise<PreviewSession> {
  const normalizedSpaceID = spaceID.trim()
  if (!normalizedSpaceID) {
    throw new Error('spaceID is required for preview session')
  }

  if (!options.forceRefresh) {
    const cached = previewSessions.get(normalizedSpaceID)
    if (!shouldRefreshSession(cached)) {
      return cached!
    }
  }

  const pending = pendingPreviewSessions.get(normalizedSpaceID)
  if (pending && !options.forceRefresh) {
    return pending
  }

  const accessToken = getAuth().accessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const request = fetch(`${getBaseUrl()}/api/auth/preview-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ spaceID: normalizedSpaceID }),
    signal: options.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message =
          typeof errorData?.error === 'string'
            ? errorData.error
            : `Failed to create preview session (${response.status})`
        throw new Error(message)
      }

      const payload = (await response.json()) as {
        token: string
        expiresAt: string
        processingOrigin: string
      }
      const session: PreviewSession = {
        token: payload.token,
        expiresAt: new Date(payload.expiresAt).getTime(),
        processingOrigin: payload.processingOrigin,
      }
      previewSessions.set(normalizedSpaceID, session)
      return session
    })
    .finally(() => {
      pendingPreviewSessions.delete(normalizedSpaceID)
    })

  pendingPreviewSessions.set(normalizedSpaceID, request)
  return request
}
