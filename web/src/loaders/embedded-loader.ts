import { embeddedGuestLogin } from '@/api/auth-api'
import { getCurrentUser } from '@/api/user-api'
import { authStore } from '@/stores/auth-store'

import { imageEditorLoader } from './image-editor-loader'

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
 * Extract search params for embedded loader deps
 */
export const embeddedLoaderDeps = ({ search: { token, path } }: { search: EmbeddedSearch }) => ({
  token,
  path,
})

/**
 * Parse path parameter for embedded mode
 */
export const parseEmbeddedPath = (path: string) => {
  if (!path) {
    throw new Error(
      'Path parameter is required. Expected format: /?token=YOUR_JWT_TOKEN&path=image.jpg',
    )
  }

  // Handle gallery paths: "gallery/folder/image.jpg" -> galleryKey="folder", imageKey="image.jpg"
  if (path.startsWith('gallery/')) {
    const pathParts = path.split('/')
    if (pathParts.length < 3) {
      throw new Error('Invalid gallery path format. Expected: gallery/folder/image.jpg')
    }
    const imageKey = pathParts[pathParts.length - 1]
    const galleryKey = pathParts.slice(1, -1).join('/')
    return { galleryKey, imageKey }
  }

  // Handle root level images: "image.jpg" -> galleryKey="", imageKey="image.jpg"
  return { galleryKey: '', imageKey: path }
}

/**
 * Handle embedded authentication and return auth state
 */
export const handleEmbeddedAuth = async (token: string) => {
  if (!token) {
    throw new Error(
      'Missing authentication token. Embedded mode requires a JWT token in the URL. Expected format: /?token=YOUR_JWT_TOKEN&path=image.jpg',
    )
  }

  try {
    // Call /api/auth/embedded-guest with JWT
    const response = await embeddedGuestLogin(token)

    // Get user profile with session token
    const profile = await getCurrentUser(response.token)

    // Dispatch unified init action with embedded flag and path prefix
    authStore.dispatch({
      type: 'INIT',
      payload: {
        accessToken: response.token,
        profile,
        isEmbedded: true,
        pathPrefix: response.pathPrefix || '',
      },
    })

    return {
      accessToken: response.token,
      profile,
      pathPrefix: response.pathPrefix || '',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Embedded authentication failed'

    // Set error in auth store
    authStore.dispatch({
      type: 'SET_ERROR',
      payload: { error: errorMessage },
    })

    throw new Error(errorMessage)
  }
}

/**
 * Embedded loader - handles authentication and loads image editor data
 */
export const embeddedLoader = async ({ deps: { token, path } }: { deps: EmbeddedSearch }) => {
  try {
    const authResult = await handleEmbeddedAuth(token)

    const { galleryKey, imageKey } = parseEmbeddedPath(path)

    const imageEditorData = await imageEditorLoader({
      params: { galleryKey, imageKey },
    })

    return {
      auth: authResult,
      galleryKey,
      imageKey,
      imageEditorData,
    }
  } catch (error) {
    // For embedded mode, we want to show the error rather than redirect
    const errorMessage =
      error instanceof Error ? error.message : 'Embedded mode initialization failed'

    authStore.dispatch({
      type: 'SET_ERROR',
      payload: { error: errorMessage },
    })

    // Return error state instead of throwing
    return {
      error: errorMessage,
      galleryKey: '',
      imageKey: '',
      imageEditorData: null,
    }
  }
}
