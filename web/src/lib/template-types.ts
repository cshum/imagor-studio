import type { ImageEditorState } from '@/lib/image-editor'

/**
 * Imagor Template File Format (.imagor.json)
 * Industry-standard approach with embedded preview thumbnail
 */
export interface ImagorTemplate {
  /** Template format version for future compatibility */
  version: '1.0'

  /** User-defined template name */
  name: string

  /** Optional description of what the template does */
  description?: string

  /** How dimensions should be handled when applying template */
  dimensionMode: 'adaptive' | 'predefined'

  /** Locked dimensions (only used when dimensionMode is 'predefined') */
  predefinedDimensions?: {
    width: number
    height: number
  }

  /** All image transformations (filters, layers, crops, etc.) */
  transformations: ImageEditorState

  /** Template metadata */
  metadata: {
    /** ISO 8601 timestamp when template was created */
    createdAt: string

    /**
     * @deprecated Preview is now saved as separate .imagor.preview.webp file
     * This field is kept for backward compatibility with old templates
     */
    previewImage?: string
  }
}

/**
 * Result of loading a template with warnings
 */
export interface TemplateLoadResult {
  /** Whether the template loaded successfully */
  success: boolean

  /** List of warnings encountered during load */
  warnings: TemplateWarning[]

  /** The template object (null if failed to parse) */
  template: ImagorTemplate | null

  /** Applied state with substitutions (null if failed) */
  appliedState: ImageEditorState | null
}

/**
 * Warning encountered when loading a template
 */
export interface TemplateWarning {
  /** Type of warning */
  type: 'missing-layer' | 'invalid-filter' | 'version-mismatch' | 'invalid-json'

  /** Human-readable warning message */
  message: string

  /** What was used as a substitute (if applicable) */
  substitution?: string
}

/**
 * Options for saving a template
 */
export interface SaveTemplateOptions {
  /** Template name (required) */
  name: string

  /** Optional description */
  description?: string

  /** Dimension mode */
  dimensionMode: 'adaptive' | 'predefined'

  /** Current image dimensions (used for predefined mode) */
  currentDimensions: {
    width: number
    height: number
  }

  /** Current editor state */
  editorState: ImageEditorState

  /** Base image path for preview generation */
  baseImagePath: string
}
