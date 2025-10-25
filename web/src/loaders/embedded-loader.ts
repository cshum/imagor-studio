import i18n from '@/i18n'
import { imageEditorLoader } from '@/loaders/image-editor-loader'
import { setTheme } from '@/stores/theme-store'

/**
 * Search params interface for embedded mode
 */
export interface EmbeddedSearch {
  path: string
  theme?: string
}

/**
 * Validate search params for embedded mode
 */
export const embeddedValidateSearch = (search: Record<string, unknown>): EmbeddedSearch => {
  return {
    path: (search.path as string) || '',
    theme: (search.theme as string) || undefined,
  }
}

/**
 * Extract search params for embedded loader deps (only path and theme needed)
 */
export const embeddedLoaderDeps = ({ search: { path, theme } }: { search: EmbeddedSearch }) => ({
  path,
  theme,
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
export const embeddedLoader = async ({
  deps: { path, theme },
}: {
  deps: { path: string; theme?: string }
}) => {
  // Apply theme if provided and valid
  if (theme && (theme === 'light' || theme === 'dark')) {
    await setTheme(theme)
  }

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
