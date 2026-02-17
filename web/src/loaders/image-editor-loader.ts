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

export interface TemplateMetadata {
  name: string
  description?: string
  dimensionMode: 'adaptive' | 'predefined'
  templatePath: string
}

export interface ImageEditorLoaderData {
  imagePath: string
  initialEditorOpenSections: EditorOpenSections
  breadcrumb: BreadcrumbItem
  imageEditor: ImageEditor
  isTemplate: boolean
  templateMetadata?: TemplateMetadata
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
  let imageEditor: ImageEditor
  let templateMetadata: TemplateMetadata | undefined

  if (isTemplate) {
    // Fetch template JSON via thumbnailUrls.original (backend ensures this points to the JSON file)
    if (!fileStat.thumbnailUrls?.original) {
      throw new Error('Template file URL not available')
    }

    const templateUrl = getFullImageUrl(fileStat.thumbnailUrls.original)
    const response = await fetch(templateUrl, {
      cache: 'no-store', // Prevent browser caching
    })

    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.status} ${response.statusText}`)
    }

    const template = (await response.json()) as ImagorTemplate

    // Get source image path - either from template or infer from first layer (for old templates)
    if (template.sourceImagePath) {
      actualImagePath = template.sourceImagePath
    } else if (template.transformations.layers && template.transformations.layers.length > 0) {
      // For old templates without sourceImagePath, use the first layer's image
      actualImagePath = template.transformations.layers[0].imagePath
    } else {
      throw new Error(
        'Template is missing source image path and has no layers. Cannot determine source image.',
      )
    }

    // Verify source image exists
    const sourceFileStat = await statFile(actualImagePath)
    if (!sourceFileStat || sourceFileStat.isDirectory) {
      throw new Error(`Template source image not found: ${actualImagePath}`)
    }

    // Fetch source image dimensions
    const originalDimensions = await fetchImageDimensions(actualImagePath)

    // Clear image position for better transition
    clearPosition(galleryKey, imageKey)

    // Create ImageEditor instance with source image
    imageEditor = new ImageEditor({
      imagePath: actualImagePath,
      originalDimensions,
    })

    // Strip crop parameters (source-image-specific, doesn't transfer)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cropLeft, cropTop, cropWidth, cropHeight, ...templateState } = template.transformations

    // Handle dimension mode
    if (template.dimensionMode === 'predefined' && template.predefinedDimensions) {
      // Predefined: Use locked dimensions from template
      templateState.width = template.predefinedDimensions.width
      templateState.height = template.predefinedDimensions.height
    } else {
      // Adaptive: Use source image dimensions
      templateState.width = originalDimensions.width
      templateState.height = originalDimensions.height
    }

    // Apply template state to the editor instance using restoreState()
    // This happens in the loader, so it's already there when the page loads
    imageEditor.restoreState(templateState)

    // Extract template name from filename (source of truth)
    const filename = imagePath.split('/').pop() || ''
    const templateName = filename.replace(/\.imagor\.json$/, '')

    // Store template metadata for UI
    templateMetadata = {
      name: templateName,
      description: template.description,
      dimensionMode: template.dimensionMode,
      templatePath: imagePath,
    }
  } else {
    // Normal image (not a template)
    // Fetch dimensions using utility (handles metadata API + fallback)
    const originalDimensions = await fetchImageDimensions(imagePath)

    // Clear image position for better transition
    clearPosition(galleryKey, imageKey)

    // Create ImageEditor instance
    imageEditor = new ImageEditor({
      imagePath,
      originalDimensions,
    })
  }

  return {
    imagePath: actualImagePath,
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: 'Imagor Studio' },
    imageEditor,
    isTemplate,
    templateMetadata,
  }
}
