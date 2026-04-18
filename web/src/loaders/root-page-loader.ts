import { getAuth } from '@/stores/auth-store'
import { cloudRootPageLoader } from '@/loaders/cloud/root-page-loader'
import { selfHostedRootPageLoader } from '@/loaders/selfhosted/root-page-loader'

export function rootPageLoader() {
  const auth = getAuth()
  if (auth.multiTenant) {
    return cloudRootPageLoader()
  }
  return selfHostedRootPageLoader()
}
