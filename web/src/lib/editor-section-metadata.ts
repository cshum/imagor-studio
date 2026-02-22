import { FileImage, Frame, Layers, Maximize2, Palette, RotateCw, Scissors } from 'lucide-react'

import type { SectionKey } from '@/lib/editor-section-storage.ts'

export interface SectionMetadata {
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
}

/**
 * Single source of truth for section icons and title translation keys.
 * Used by ImageEditorControls, ImageEditorLayout (DragOverlay), and EditorMenuDropdown.
 */
export const SECTION_METADATA: Record<SectionKey, SectionMetadata> = {
  crop: {
    icon: Scissors,
    titleKey: 'imageEditor.controls.cropAspect',
  },
  effects: {
    icon: Palette,
    titleKey: 'imageEditor.controls.colorEffects',
  },
  transform: {
    icon: RotateCw,
    titleKey: 'imageEditor.controls.transformRotate',
  },
  dimensions: {
    icon: Maximize2,
    titleKey: 'imageEditor.controls.dimensionsResize',
  },
  fill: {
    icon: Frame,
    titleKey: 'imageEditor.controls.fillPadding',
  },
  output: {
    icon: FileImage,
    titleKey: 'imageEditor.controls.outputCompression',
  },
  layers: {
    icon: Layers,
    titleKey: 'imageEditor.layers.title',
  },
}
