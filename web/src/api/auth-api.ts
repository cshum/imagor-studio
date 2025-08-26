export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  displayName: string
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresIn: number
  user: {
    id: string
    displayName: string
    email: string
    role: string
  }
}

export interface FirstRunResponse {
  isFirstRun: boolean
  timestamp: number
}

export interface RefreshTokenRequest {
  token: string
}

const API_BASE = 'http://localhost:8080'

/**
 * Check if this is the first run (no admin exists)
 */
export async function checkFirstRun(): Promise<FirstRunResponse> {
  const response = await fetch(`${API_BASE}/auth/first-run`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Register the first admin user
 */
export async function registerAdmin(credentials: RegisterRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/register-admin`, {
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
  const response = await fetch(`${API_BASE}/auth/register`, {
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
 * Login with email and password
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
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
 * Login as guest
 */
export async function guestLogin(): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE}/auth/guest`, {
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
  const response = await fetch(`${API_BASE}/auth/refresh`, {
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
