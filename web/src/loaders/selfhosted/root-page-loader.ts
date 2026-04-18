import { galleryLoader } from '@/loaders/gallery-loader'

export function selfHostedRootPageLoader() {
  return galleryLoader({ params: { galleryKey: '' } })
}
