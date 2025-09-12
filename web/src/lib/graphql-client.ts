import { GraphQLClient } from 'graphql-request'

import { getAuth } from '@/stores/auth-store.ts'

const endpoint = `${import.meta.env.VITE_API_BASE_URL}/api/query`

export const createGraphQLClient = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return new GraphQLClient(endpoint, { headers })
}

export const getGraphQLClient = (token?: string) => {
  return createGraphQLClient(token || getAuth().accessToken || undefined)
}
