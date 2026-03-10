import { Folder, Image, Paintbrush } from 'lucide-react'

import { isColorLayer, isGroupLayer } from '@/lib/image-editor'

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
