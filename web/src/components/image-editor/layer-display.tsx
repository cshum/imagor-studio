import type { TFunction } from 'i18next'
import { Folder, Image, Paintbrush } from 'lucide-react'

import { isColorLayer, isGroupLayer } from '@/lib/image-editor'
import type { ImageLayer, Layer } from '@/lib/image-editor'

// ─── Icon helpers ────────────────────────────────────────────────────────────

/**
 * Returns the correct Lucide icon component for a given image path.
 * - Group layer (color:none) → Folder
 * - Color layer (color:#hex)  → Paintbrush
 * - Image layer               → Image
 */
export function getLayerIcon(imagePath: string) {
  if (isGroupLayer(imagePath)) return Folder
  if (isColorLayer(imagePath)) return Paintbrush
  return Image
}

interface LayerIconProps {
  imagePath: string
  className?: string
}

/**
 * Renders the correct icon for a layer based on its image path.
 */
export function LayerIcon({ imagePath, className }: LayerIconProps) {
  const Icon = getLayerIcon(imagePath)
  return <Icon className={className} />
}

// ─── Edit label helper ───────────────────────────────────────────────────────

/**
 * Returns the i18n key for the "edit" action label based on the layer's image path.
 * - Group layer → 'imageEditor.layers.editGroup'
 * - Color layer → 'imageEditor.layers.editColor'
 * - Image layer → 'imageEditor.layers.editImage'
 */
export function getLayerEditLabel(imagePath: string, t: TFunction): string {
  if (isGroupLayer(imagePath)) return t('imageEditor.layers.editGroup')
  if (isColorLayer(imagePath)) return t('imageEditor.layers.editColor')
  return t('imageEditor.layers.editImage')
}

// ─── Display name helper ─────────────────────────────────────────────────────

/**
 * Returns a human-readable display name for a layer.
 * Priority: explicit name → text content → type-based fallback → filename
 */
export function getLayerDisplayName(layer: Layer, t: TFunction): string {
  if (layer.name) return layer.name
  if (layer.type === 'text') {
    return layer.text.replace(/\n/g, ' ').trim().slice(0, 60) || t('imageEditor.layers.textLayer')
  }
  const imagePath = (layer as ImageLayer).imagePath
  if (isGroupLayer(imagePath)) return t('imageEditor.layers.groupLayer')
  if (isColorLayer(imagePath)) return t('imageEditor.layers.colorLayer')
  return imagePath.split('/').pop() || imagePath
}
