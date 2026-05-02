import { statFile } from '@/api/storage-api'
import { addCacheBuster, getFullImageUrl } from '@/lib/api-utils'
import { EditorSectionStorage, type EditorSections } from '@/lib/editor-sections'
import { getFileDisplayName } from '@/lib/file-utils'
import { fetchImageDimensions } from '@/lib/image-dimensions'
import { ImageEditor, isColorLayer, isGroupLayer } from '@/lib/image-editor'
import type { ImagorTemplate } from '@/lib/image-editor'
import { joinImagePath } from '@/lib/path-utils'
import { getAuth } from '@/stores/auth-store'
import { clearPosition } from '@/stores/image-position-store.ts'

export interface TemplateMetadata {
  name: string
  description?: string
  dimensionMode: 'adaptive' | 'predefined'
  templatePath: string
}

export interface ImageEditorLoaderData {
  initialEditorOpenSections: EditorSections
  breadcrumb?: { label: string }
  imageEditor: ImageEditor
  isTemplate: boolean
  spaceID?: string
  spaceName?: string
  templateMetadata?: TemplateMetadata
}

/**
 * Image editor loader - fetches image dimensions and creates ImageEditor instance
 * Dimensions are fetched from metadata API when available, otherwise by loading the image
 * If the file is a template (.imagor.json), loads the source image and applies transformations
 */
export const imageEditorLoader = async ({
  params: { galleryKey, imageKey, spaceID, spaceName },
}: {
  params: {
    galleryKey: string
    imageKey: string
    spaceID?: string
    spaceName?: string
  }
}): Promise<ImageEditorLoaderData> => {
  const imagePath = joinImagePath(galleryKey, imageKey)

  // Load user preferences for editor open sections using storage service
  const authState = getAuth()
  const storage = new EditorSectionStorage(authState)
  const [fileStat, editorOpenSections] = await Promise.all([
    statFile(imagePath, spaceID),
    storage.get(),
  ])

  if (!fileStat || fileStat.isDirectory || !fileStat.thumbnailUrls) {
    throw new Error('Image not found')
  }

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

    // Add cache-busting to prevent stale template JSON
    const templateUrl = addCacheBuster(
      getFullImageUrl(fileStat.thumbnailUrls.original),
      fileStat.modifiedTime,
    )
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
      const firstLayer = template.transformations.layers[0]
      if (firstLayer.type !== 'text') {
        actualImagePath = firstLayer.imagePath
      }
    } else {
      throw new Error(
        'Template is missing source image path and has no layers. Cannot determine source image.',
      )
    }

    // Color images are virtual (imagor generates them on-the-fly) — skip file stat.
    // Real images need to be verified and have their dimensions fetched.
    let originalDimensions: { width: number; height: number }
    if (isColorLayer(actualImagePath) || isGroupLayer(actualImagePath)) {
      originalDimensions = { width: 1, height: 1 }
    } else {
      const sourceFileStat = await statFile(actualImagePath, spaceID)
      if (!sourceFileStat || sourceFileStat.isDirectory || !sourceFileStat.thumbnailUrls) {
        throw new Error(`Template source image not found: ${actualImagePath}`)
      }
      originalDimensions = await fetchImageDimensions(actualImagePath, spaceID, sourceFileStat)
    }

    // Clear image position for better transition
    clearPosition(galleryKey, imageKey)

    // Create ImageEditor instance with source image
    imageEditor = new ImageEditor({
      imagePath: actualImagePath,
      spaceID,
      originalDimensions,
    })

    // Use ImageEditor's importTemplate method (single source of truth)
    // This handles all dimension modes, crop validation, etc.
    await imageEditor.importTemplate(JSON.stringify(template))

    // Snapshot the clean template state so initialize() can restore it when
    // the user navigates back (the same cached instance is reused).
    imageEditor.markInitialState()

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
    const originalDimensions = await fetchImageDimensions(imagePath, spaceID, fileStat)

    // Clear image position for better transition
    clearPosition(galleryKey, imageKey)

    // Create ImageEditor instance
    imageEditor = new ImageEditor({
      imagePath,
      spaceID,
      originalDimensions,
    })
    // Snapshot the initial config so initialize() can restore it on remount.
    // Consistent with canvas and template loaders — ensures imagePath and
    // originalDimensions are always reset correctly if the instance is reused.
    imageEditor.markInitialState()
  }

  // Set breadcrumb label for browser title:
  // - template: use template name (e.g. "My Template")
  // - normal image: use filename without extension (e.g. "photo")
  const breadcrumbLabel =
    isTemplate && templateMetadata
      ? templateMetadata.name
      : getFileDisplayName(imageKey.split('/').pop() || imageKey)

  return {
    initialEditorOpenSections: editorOpenSections,
    breadcrumb: { label: breadcrumbLabel },
    imageEditor,
    isTemplate,
    spaceID,
    spaceName,
    templateMetadata,
  }
}
