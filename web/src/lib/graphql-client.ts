import { GraphQLClient } from 'graphql-request'

const endpoint = 'http://localhost:8080/query'

// Create a GraphQL client with authentication
export const createGraphQLClient = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return new GraphQLClient(endpoint, {
    headers,
  })
}

// Default client without authentication (for login)
export const graphqlClient = createGraphQLClient()

// Authenticated client factory
export const createAuthenticatedClient = (token: string) => {
  return createGraphQLClient(token)
}

// Token management utilities
export interface AuthTokens {
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

export class AuthManager {
  private static instance: AuthManager
  private tokens: AuthTokens | null = null
  private client: GraphQLClient

  private constructor() {
    this.client = graphqlClient
    this.loadTokensFromStorage()
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  private loadTokensFromStorage() {
    try {
      const storedTokens = localStorage.getItem('auth_tokens')
      if (storedTokens) {
        this.tokens = JSON.parse(storedTokens)
        if (this.tokens) {
          this.updateClient()
        }
      }
    } catch (error) {
      console.warn('Failed to load tokens from storage:', error)
      this.clearTokens()
    }
  }

  private saveTokensToStorage() {
    try {
      if (this.tokens) {
        localStorage.setItem('auth_tokens', JSON.stringify(this.tokens))
      } else {
        localStorage.removeItem('auth_tokens')
      }
    } catch (error) {
      console.warn('Failed to save tokens to storage:', error)
    }
  }

  private updateClient() {
    if (this.tokens?.accessToken) {
      this.client = createAuthenticatedClient(this.tokens.accessToken)
    } else {
      this.client = graphqlClient
    }
  }

  setTokens(tokens: AuthTokens) {
    this.tokens = tokens
    this.saveTokensToStorage()
    this.updateClient()
  }

  getTokens(): AuthTokens | null {
    return this.tokens
  }

  getAccessToken(): string | null {
    return this.tokens?.accessToken || null
  }

  clearTokens() {
    this.tokens = null
    this.saveTokensToStorage()
    this.updateClient()
  }

  isAuthenticated(): boolean {
    return !!this.tokens?.accessToken
  }

  getClient(): GraphQLClient {
    return this.client
  }

  // Check if token is expired (with 5 minute buffer)
  isTokenExpired(): boolean {
    if (!this.tokens) return true

    const now = Date.now()
    const tokenExpiration = this.tokens.expiresIn * 1000 // Convert to milliseconds
    const buffer = 5 * 60 * 1000 // 5 minutes in milliseconds

    return now >= tokenExpiration - buffer
  }
}

// Export singleton instance
export const authManager = AuthManager.getInstance()

// Export the client getter for easy access
export const getGraphQLClient = () => authManager.getClient()
