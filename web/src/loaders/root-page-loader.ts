import { galleryLoader } from '@/loaders/gallery-loader'

export function rootPageLoader() {
  return galleryLoader({ params: { galleryKey: '' } })
}
