import { verifyEmailChange, type AuthApiError } from '@/api/auth-api'
import { getAuth, refreshAuthSession } from '@/stores/auth-store'

export interface EmailChangeVerifyLoaderData {
  status: 'success' | 'error'
  errorMessage: string
  verifiedEmail: string | null
  isAuthenticated: boolean
}

export const emailChangeVerifyLoader = async (): Promise<EmailChangeVerifyLoaderData> => {
  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get('token')?.trim()

  if (!token) {
    return {
      status: 'error',
      errorMessage: 'The confirmation link is missing its verification token.',
      verifiedEmail: null,
      isAuthenticated: getAuth().state === 'authenticated',
    }
  }

  try {
    const response = await verifyEmailChange(token)
    const isAuthenticated = getAuth().state === 'authenticated'
    if (isAuthenticated) {
      await refreshAuthSession().catch(() => getAuth())
    }

    return {
      status: 'success',
      errorMessage: '',
      verifiedEmail: response.email,
      isAuthenticated,
    }
  } catch (error) {
    const apiError = error as AuthApiError
    return {
      status: 'error',
      errorMessage:
        apiError.message ||
        'We could not verify your email change. Please request a new change from your account settings.',
      verifiedEmail: null,
      isAuthenticated: getAuth().state === 'authenticated',
    }
  }
}