import { authManager } from '@/lib/graphql-client'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresIn: number
}

export interface RefreshTokenRequest {
  token: string
}

/**
 * Development login - creates a token for testing
 * In production, this should validate credentials against a user database
 */
export const devLogin = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await fetch('http://localhost:8080/auth/dev-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data: LoginResponse = await response.json()

    // Store tokens in auth manager
    authManager.setTokens({
      accessToken: data.token,
      expiresIn: Date.now() + data.expiresIn * 1000, // Convert to timestamp
    })

    return data
  } catch (error) {
    console.error('Login failed:', error)
    throw error instanceof Error ? error : new Error('Login failed')
  }
}

/**
 * Refresh an existing token
 */
export const refreshToken = async (): Promise<LoginResponse> => {
  const currentToken = authManager.getAccessToken()

  if (!currentToken) {
    throw new Error('No token available to refresh')
  }

  try {
    const response = await fetch('http://localhost:8080/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: currentToken }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const data: LoginResponse = await response.json()

    // Update tokens in auth manager
    authManager.setTokens({
      accessToken: data.token,
      expiresIn: Date.now() + data.expiresIn * 1000, // Convert to timestamp
    })

    return data
  } catch (error) {
    console.error('Token refresh failed:', error)
    // Clear invalid tokens
    authManager.clearTokens()
    throw error instanceof Error ? error : new Error('Token refresh failed')
  }
}

/**
 * Logout user by clearing tokens
 */
export const logout = async (): Promise<void> => {
  authManager.clearTokens()
}

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return authManager.isAuthenticated() && !authManager.isTokenExpired()
}

/**
 * Get current access token
 */
export const getAccessToken = (): string | null => {
  if (authManager.isTokenExpired()) {
    return null
  }
  return authManager.getAccessToken()
}

/**
 * Auto-refresh token if it's about to expire
 */
export const ensureValidToken = async (): Promise<string | null> => {
  if (!authManager.isAuthenticated()) {
    return null
  }

  if (authManager.isTokenExpired()) {
    try {
      await refreshToken()
      return authManager.getAccessToken()
    } catch (error) {
      console.warn('Auto token refresh failed:', error)
      return null
    }
  }

  return authManager.getAccessToken()
}
