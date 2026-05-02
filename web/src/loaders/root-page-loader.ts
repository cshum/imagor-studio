import { galleryLoader } from '@/loaders/gallery-loader'
import { getAuth } from '@/stores/auth-store'

export function rootPageLoader() {
  if (getAuth().multiTenant) {
    return null
  }

  return galleryLoader({ params: { galleryKey: '' } })
}
