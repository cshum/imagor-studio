import { cloudRootPageLoader } from '@/loaders/cloud/root-page-loader'
import { selfHostedRootPageLoader } from '@/loaders/selfhosted/root-page-loader'
import { getAuth } from '@/stores/auth-store'

export function rootPageLoader() {
  const auth = getAuth()
  if (auth.multiTenant) {
    return cloudRootPageLoader()
  }
  return selfHostedRootPageLoader()
}
