import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'
import type { Auth } from '@/stores/auth-store'

// Define sections as a const object (single source of truth with default states)
const EDITOR_SECTIONS = {
  layers: false,
  crop: true,
  effects: true,
  transform: false,
  dimensions: false,
  output: false,
  fill: false,
} as const

// Derive SectionKey from the object keys
export type SectionKey = keyof typeof EDITOR_SECTIONS

// Use Record type for better type safety
export interface EditorOpenSections extends Record<SectionKey, boolean> {
  sectionOrder: SectionKey[]
  leftColumn: SectionKey[]
  rightColumn: SectionKey[]
}

// Default sections with proper typing
const defaultOpenSections: EditorOpenSections = {
  ...EDITOR_SECTIONS,
  sectionOrder: Object.keys(EDITOR_SECTIONS) as SectionKey[],
  leftColumn: ['layers', 'crop'],
  rightColumn: ['effects', 'transform', 'dimensions', 'fill', 'output'],
}

export class EditorOpenSectionsStorage {
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

  async get(): Promise<EditorOpenSections> {
    try {
      const value = await this.storage.get()
      if (value) {
        const savedSections = JSON.parse(value) as Partial<EditorOpenSections>

        // Merge with defaults to ensure all properties exist
        const merged = { ...defaultOpenSections, ...savedSections }

        // Ensure sectionOrder exists and contains valid sections
        if (!merged.sectionOrder || !Array.isArray(merged.sectionOrder)) {
          merged.sectionOrder = defaultOpenSections.sectionOrder
        } else {
          // Filter out any invalid section keys and ensure all valid sections are present
          const validSectionKeys = Object.keys(EDITOR_SECTIONS) as SectionKey[]
          const filteredOrder = merged.sectionOrder.filter((key): key is SectionKey =>
            validSectionKeys.includes(key as SectionKey),
          )

          // Add any missing sections to the end
          validSectionKeys.forEach((key) => {
            if (!filteredOrder.includes(key)) {
              filteredOrder.push(key)
            }
          })

          merged.sectionOrder = filteredOrder
        }

        // Ensure leftColumn and rightColumn exist and contain valid sections
        const validSectionKeys = Object.keys(EDITOR_SECTIONS) as SectionKey[]

        if (!merged.leftColumn || !Array.isArray(merged.leftColumn)) {
          merged.leftColumn = defaultOpenSections.leftColumn
        } else {
          merged.leftColumn = merged.leftColumn.filter((key): key is SectionKey =>
            validSectionKeys.includes(key as SectionKey),
          )
        }

        if (!merged.rightColumn || !Array.isArray(merged.rightColumn)) {
          merged.rightColumn = defaultOpenSections.rightColumn
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

        return merged as EditorOpenSections
      }
    } catch {
      // Silently fall back to defaults if parsing fails
    }
    return defaultOpenSections
  }

  async set(sections: EditorOpenSections): Promise<void> {
    try {
      await this.storage.set(JSON.stringify(sections))
    } catch {
      // Silently fail if storage fails
    }
  }
}
