import { redirect } from '@tanstack/react-router'

import { verifyPublicSignup, type AuthApiError } from '@/api/auth-api'
import { getAuth, initAuth } from '@/stores/auth-store'

export interface RegisterVerifyLoaderData {
  errorMessage: string
  verificationEmail: string | null
}

export const registerVerifyLoader = async (): Promise<RegisterVerifyLoaderData> => {
  const searchParams = new URLSearchParams(window.location.search)
  const token = searchParams.get('token')?.trim()
  const email = searchParams.get('email')?.trim() || null

  if (!token) {
    return {
      errorMessage: 'The confirmation link is missing its verification token.',
      verificationEmail: email,
    }
  }

  let response: Awaited<ReturnType<typeof verifyPublicSignup>>

  try {
    response = await verifyPublicSignup(token)
  } catch (error) {
    const apiError = error as AuthApiError

    if (apiError.status === 409 || apiError.status === 400) {
      const restoredAuth = await initAuth().catch(() => null)
      const currentAuth = restoredAuth ?? getAuth()
      if (currentAuth.state === 'authenticated' && currentAuth.accessToken) {
        throw redirect({ to: '/' })
      }
    }

    return {
      errorMessage:
        apiError.message ||
        'We could not verify your account. Please request a new confirmation email.',
      verificationEmail: email,
    }
  }

  await initAuth(response.token)
  throw redirect({ to: '/' })
}
