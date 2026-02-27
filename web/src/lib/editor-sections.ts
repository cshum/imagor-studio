import React from 'react'
import { FileImage, Frame, Layers, Maximize2, Palette, RotateCw, Scissors } from 'lucide-react'

import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'
import type { Auth } from '@/stores/auth-store'

const EDITOR_SECTIONS = {
  layers: true,
  crop: true,
  effects: true,
  transform: true,
  dimensions: false,
  output: false,
  fill: false,
} as const

export type SectionKey = keyof typeof EDITOR_SECTIONS

export const SECTION_KEYS: SectionKey[] = [
  'crop',
  'layers',
  'effects',
  'transform',
  'dimensions',
  'output',
  'fill',
]

export interface SectionMetadata {
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
}

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

export interface EditorSections extends Record<SectionKey, boolean> {
  leftColumn: SectionKey[]
  rightColumn: SectionKey[]
  visibleSections: SectionKey[]
}

const defaultSections: EditorSections = {
  ...EDITOR_SECTIONS,
  leftColumn: ['crop', 'layers'],
  rightColumn: ['effects', 'transform', 'dimensions', 'fill', 'output'],
  visibleSections: ['crop', 'layers', 'effects', 'transform', 'dimensions', 'fill', 'output'],
}

export class EditorSectionStorage {
  private storage: ConfigStorage

  constructor(auth: Auth) {
    if (auth.isEmbedded) {
      // Embedded mode: use localStorage
      this.storage = new LocalConfigStorage('editor_open_sections')
    } else {
      // Non-embedded mode: use UserRegistryConfigStorage with localStorage fallback
      const localStorage = new LocalConfigStorage('editor_open_sections')
      this.storage = new UserRegistryConfigStorage('editor_open_sections', localStorage)
    }
  }

  async get(): Promise<EditorSections> {
    try {
      const value = await this.storage.get()
      if (value) {
        const savedSections = JSON.parse(value) as Partial<EditorSections>

        // Merge with defaults to ensure all properties exist
        const merged = { ...defaultSections, ...savedSections }

        // Ensure leftColumn and rightColumn exist and contain valid sections
        const validSectionKeys = Object.keys(EDITOR_SECTIONS) as SectionKey[]

        if (!merged.leftColumn || !Array.isArray(merged.leftColumn)) {
          merged.leftColumn = defaultSections.leftColumn
        } else {
          merged.leftColumn = merged.leftColumn.filter((key): key is SectionKey =>
            validSectionKeys.includes(key as SectionKey),
          )
        }

        if (!merged.rightColumn || !Array.isArray(merged.rightColumn)) {
          merged.rightColumn = defaultSections.rightColumn
        } else {
          merged.rightColumn = merged.rightColumn.filter((key): key is SectionKey =>
            validSectionKeys.includes(key as SectionKey),
          )
        }

        // Ensure all sections are assigned to a column
        const assignedSections = new Set([...merged.leftColumn, ...merged.rightColumn])
        validSectionKeys.forEach((key) => {
          if (!assignedSections.has(key)) {
            // Add missing sections to right column by default
            merged.rightColumn.push(key)
          }
        })

        // Ensure visibleSections exists and contains valid sections
        if (!merged.visibleSections || !Array.isArray(merged.visibleSections)) {
          merged.visibleSections = defaultSections.visibleSections
        } else {
          merged.visibleSections = merged.visibleSections.filter((key): key is SectionKey =>
            validSectionKeys.includes(key as SectionKey),
          )
        }

        return merged as EditorSections
      }
    } catch {
      // Silently fall back to defaults if parsing fails
    }
    return defaultSections
  }

  async set(sections: EditorSections): Promise<void> {
    try {
      await this.storage.set(JSON.stringify(sections))
    } catch {
      // Silently fail if storage fails
    }
  }
}
