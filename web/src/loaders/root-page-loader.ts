import { spacesLoader } from '@/loaders/account-loader'
import { galleryLoader } from '@/loaders/gallery-loader'
import { getAuth } from '@/stores/auth-store'

export function rootPageLoader() {
  const auth = getAuth()
  if (auth.multiTenant) {
    return spacesLoader()
  }
  return galleryLoader({ params: { galleryKey: '' } })
}
