import { getBaseUrl } from '@/lib/api-utils'

export interface LoginRequest {
  username: string
  password: string
  inviteToken?: string
}

export interface RegisterRequest {
  displayName: string
  email: string
  username?: string
  password: string
  inviteToken?: string
}

export type AuthApiError = Error & {
  code?: string
  field?: string
  reason?: string
  status?: number
}

function createAuthApiError(errorData: unknown, fallback: string): AuthApiError {
  const payload =
    typeof errorData === 'object' && errorData !== null
      ? (errorData as Record<string, unknown>)
      : {}
  const details =
    typeof payload.details === 'object' && payload.details !== null
      ? (payload.details as Record<string, unknown>)
      : undefined
  const error = new Error(
    typeof payload.error === 'string' ? payload.error : fallback,
  ) as AuthApiError

  if (typeof payload.code === 'string') {
    error.code = payload.code
  }
  if (typeof details?.field === 'string') {
    error.field = details.field
  }
  if (typeof details?.reason === 'string') {
    error.reason = details.reason
  }

  return error
}

export interface RegisterAdminRequest {
  displayName: string
  username: string
  password: string
  defaultLanguage?: string
}

export interface LoginResponse {
  token: string
  expiresIn: number
  redirectPath?: string
  user: {
    id: string
    displayName: string
    username: string
    role: string
  }
  pathPrefix?: string
}

export interface PublicSignupVerificationResponse {
  email: string
  verificationRequired: boolean
  cooldownSeconds: number
  expiresInSeconds: number
  maskedDestination: string
}

export interface EmailChangeVerificationResponse {
  userId: string
  email: string
}

export type RegisterResult =
  | {
      kind: 'authenticated'
      response: LoginResponse
    }
  | {
      kind: 'verification-required'
      response: PublicSignupVerificationResponse
    }

export interface FirstRunResponse {
  isFirstRun: boolean
  multiTenant: boolean
  timestamp: number
}

export interface RefreshTokenRequest {
  token: string
}

export interface GuestLoginRequest {
  spaceKey?: string
}

const BASE_URL = getBaseUrl()

/**
 * Check if this is the first run (no admin exists)
 */
export async function checkFirstRun(): Promise<FirstRunResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/first-run`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Register the first admin user
 */
export async function registerAdmin(credentials: RegisterAdminRequest): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/register-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Register a new user
 */
export async function register(credentials: RegisterRequest): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

function withStatus(error: AuthApiError, status: number): AuthApiError {
  error.status = status
  return error
}

function isVerificationSignupUnavailable(error: AuthApiError): boolean {
  return (
    error.status === 404 ||
    (error.status === 403 &&
      error.message === 'Email verification sign-up is not available in this deployment.')
  )
}

export async function registerWithVerificationFallback(
  credentials: RegisterRequest,
): Promise<RegisterResult> {
  if (credentials.inviteToken?.trim()) {
    return {
      kind: 'authenticated',
      response: await register(credentials),
    }
  }

  const response = await fetch(`${BASE_URL}/api/auth/register/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: credentials.displayName,
      email: credentials.email,
      password: credentials.password,
      inviteToken: credentials.inviteToken,
    }),
  })

  if (response.ok) {
    return {
      kind: 'verification-required',
      response: await response.json(),
    }
  }

  const errorData = await response.json().catch(() => ({}))
  const error = withStatus(
    createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
    response.status,
  )

  if (isVerificationSignupUnavailable(error)) {
    if (credentials.inviteToken?.trim()) {
      throw error
    }
    return {
      kind: 'authenticated',
      response: await register(credentials),
    }
  }

  throw error
}

export async function verifyPublicSignup(token: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw withStatus(
      createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
      response.status,
    )
  }

  return response.json()
}

export async function resendPublicSignupVerification(
  email: string,
): Promise<PublicSignupVerificationResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/register/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw withStatus(
      createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
      response.status,
    )
  }

  return response.json()
}

export async function verifyEmailChange(
  token: string,
): Promise<EmailChangeVerificationResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/account/email/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw withStatus(
      createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
      response.status,
    )
  }

  return response.json()
}

/**
 * Login with username and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Login as guest
 */
export async function guestLogin(spaceKey?: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: spaceKey ? JSON.stringify({ spaceKey } satisfies GuestLoginRequest) : undefined,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Refresh access token
 */
export async function refreshToken(token: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Login as embedded guest using JWT token
 */
export async function embeddedGuestLogin(jwtToken: string): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/embedded-guest`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

export interface AuthProvidersResponse {
  providers: string[]
}

export interface InvitationResolutionResponse {
  organizationName: string
  spaceName?: string
  invitedEmail: string
  role: string
}

/**
 * Returns the URL to redirect the browser to for Google OAuth login.
 * Uses the configured API base URL so it works correctly in dev (VITE_API_BASE_URL=http://localhost:8080)
 * and in production (same-host, empty base URL → relative /api/... path).
 */
export function getGoogleLoginUrl(inviteToken?: string): string {
  if (inviteToken?.trim()) {
    const query = new URLSearchParams({ invite_token: inviteToken.trim() })
    return `${BASE_URL}/api/auth/google/login?${query.toString()}`
  }

  return `${BASE_URL}/api/auth/google/login`
}

export async function resolveInvitation(
  inviteToken: string,
): Promise<InvitationResolutionResponse> {
  const query = new URLSearchParams({ invite_token: inviteToken })
  const response = await fetch(`${BASE_URL}/api/invitations/resolve?${query.toString()}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw withStatus(
      createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
      response.status,
    )
  }

  return response.json()
}

export async function acceptInvitation(
  inviteToken: string,
  accessToken: string,
): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/invitations/accept`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inviteToken }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw withStatus(
      createAuthApiError(errorData, `HTTP ${response.status}: ${response.statusText}`),
      response.status,
    )
  }

  return response.json()
}

/**
 * Get available auth providers (e.g. google, github)
 */
export async function getAuthProviders(): Promise<AuthProvidersResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/providers`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}
