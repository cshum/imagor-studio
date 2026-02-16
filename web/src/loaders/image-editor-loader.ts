import { statFile } from '@/api/storage-api'
import { BreadcrumbItem } from '@/hooks/use-breadcrumb.ts'
import { getFullImageUrl } from '@/lib/api-utils'
import {
  EditorOpenSectionsStorage,
  type EditorOpenSections,
} from '@/lib/editor-open-sections-storage'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import { ImageEditor } from '@/lib/image-editor'
import { joinImagePath } from '@/lib/path-utils'
import type { ImagorTemplate } from '@/lib/template-types'
import { getAuth } from '@/stores/auth-store'
import { clearPosition } from '@/stores/image-position-store.ts'

interface ImageEditorWithTemplate extends ImageEditor {
  pendingTemplate?: ImagorTemplate
}

export interface ImageEditorLoaderData {
  imagePath: string
  initialEditorOpenSections: EditorOpenSections
  breadcrumb: BreadcrumbItem
  imageEditor: ImageEditor
}

/**
 * Image editor loader - fetches image dimensions and creates ImageEditor instance
 * Dimensions are fetched from metadata API when available, otherwise by loading the image
 * If the file is a template (.imagor.json), loads the source image and applies transformations
 */
export const imageEditorLoader = async ({
  params: { galleryKey, imageKey },
}: {
  params: { galleryKey: string; imageKey: string }
}): Promise<ImageEditorLoaderData> => {
  const imagePath = joinImagePath(galleryKey, imageKey)
  const fileStat = await statFile(imagePath)

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

  // Load user preferences for editor open sections using storage service
  const authState = getAuth()
  const storage = new EditorOpenSectionsStorage(authState)
  const editorOpenSections = await storage.get()

  // Check if this is a template file
  const isTemplate = imageKey.endsWith('.imagor.json')

  let actualImagePath = imagePath
  let template: ImagorTemplate | null = null

  if (isTemplate) {
    // Fetch template JSON via thumbnailUrls.original (backend ensures this points to the JSON file)
    if (!fileStat.thumbnailUrls?.original) {
      throw new Error('Template file URL not available')
    }

    const templateUrl = getFullImageUrl(fileStat.thumbnailUrls.original)
    const response = await fetch(templateUrl)

    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status} ${response.statusText}`)
    }

    template = (await response.json()) as ImagorTemplate

    // Use source image path from template
    actualImagePath = template.sourceImagePath

    // Verify source image exists
    const sourceFileStat = await statFile(actualImagePath)
    if (!sourceFileStat || sourceFileStat.isDirectory) {
      throw new Error(`Template source image not found: ${actualImagePath}`)
    }
  }

  // Fetch dimensions using utility (handles metadata API + fallback)
  const originalDimensions = await fetchImageDimensions(actualImagePath)

  // Clear image position for better transition
  clearPosition(galleryKey, imageKey)

  // Create ImageEditor instance with actual image path
  const imageEditor = new ImageEditor({
    imagePath: actualImagePath,
    originalDimensions,
  })

  // If template, apply transformations after editor is created
  if (template) {
    // Apply template state (will be done in the page component after initialization)
    // Store template in editor for later application
    ;(imageEditor as ImageEditorWithTemplate).pendingTemplate = template
  }

  return {
    imagePath: actualImagePath,
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
    imageEditor,
  }
}
