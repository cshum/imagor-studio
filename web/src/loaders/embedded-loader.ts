import i18n from '@/i18n'
import { imageEditorLoader } from '@/loaders/image-editor-loader'

/**
 * Search params interface for embedded mode
 */
export interface EmbeddedSearch {
  token: string
  path: string
}

/**
 * Validate search params for embedded mode
 */
export const embeddedValidateSearch = (search: Record<string, unknown>): EmbeddedSearch => {
  return {
    token: (search.token as string) || '',
    path: (search.path as string) || '',
  }
}

/**
 * Extract search params for embedded loader deps (only path needed)
 */
export const embeddedLoaderDeps = ({ search: { path } }: { search: EmbeddedSearch }) => ({
  path,
})

/**
 * Parse path parameter for embedded mode
 */
export const parseEmbeddedPath = (path: string) => {
  if (!path) {
    throw new Error(i18n.t('auth.embedded.pathMissing'))
  }

  // Handle gallery paths: "gallery/folder/image.jpg" -> galleryKey="folder", imageKey="image.jpg"
  if (path.startsWith('gallery/')) {
    const pathParts = path.split('/')
    if (pathParts.length < 3) {
      throw new Error(i18n.t('auth.embedded.pathInvalid'))
    }
    const imageKey = pathParts[pathParts.length - 1]
    const galleryKey = pathParts.slice(1, -1).join('/')
    return { galleryKey, imageKey }
  }

  // Handle root level images: "image.jpg" -> galleryKey="", imageKey="image.jpg"
  return { galleryKey: '', imageKey: path }
}

/**
 * Embedded loader - loads image editor data (auth handled by initAuth)
 */
export const embeddedLoader = async ({ deps: { path } }: { deps: { path: string } }) => {
  // Parse path (will throw if invalid)
  const { galleryKey, imageKey } = parseEmbeddedPath(path)

  // Load image editor data (will throw if fails)
  const imageEditorData = await imageEditorLoader({
    params: { galleryKey, imageKey },
  })

  return {
    galleryKey,
    imageKey,
    imageEditorData,
  }
}
