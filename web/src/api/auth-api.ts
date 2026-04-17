import { getBaseUrl } from '@/lib/api-utils'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  username: string
  password: string
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
  user: {
    id: string
    displayName: string
    username: string
    role: string
  }
  pathPrefix?: string
}

export interface FirstRunResponse {
  isFirstRun: boolean
  multiTenant: boolean
  timestamp: number
}

export interface RefreshTokenRequest {
  token: string
}

const BASE_URL = getBaseUrl()

/**
 * Check if this is the first run (no admin exists)
 */
export async function checkFirstRun(): Promise<FirstRunResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/first-run`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
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
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
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
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
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
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Login as guest
 */
export async function guestLogin(): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/api/auth/guest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

/**
 * Returns the URL to redirect the browser to for Google OAuth login.
 * Uses the configured API base URL so it works correctly in dev (VITE_API_BASE_URL=http://localhost:8080)
 * and in production (same-host, empty base URL → relative /api/... path).
 */
export function getGoogleLoginUrl(): string {
  return `${BASE_URL}/api/auth/google/login`
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
