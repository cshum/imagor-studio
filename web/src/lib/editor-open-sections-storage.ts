import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'
import type { Auth } from '@/stores/auth-store'

// Define sections as a const array (single source of truth)
const EDITOR_SECTIONS = ['crop', 'effects', 'transform', 'dimensions', 'output'] as const

// Derive SectionId from the array
export type SectionId = (typeof EDITOR_SECTIONS)[number]

// Use mapped type for type safety
export type EditorOpenSections = {
  [K in SectionId]: boolean
} & {
  sectionOrder: SectionId[]
}

const defaultOpenSections: EditorOpenSections = {
  crop: true,
  effects: true,
  transform: false,
  dimensions: false,
  output: false,
  sectionOrder: [...EDITOR_SECTIONS],
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
          // Filter out any invalid section IDs and ensure all valid sections are present
          const validSectionIds = [...EDITOR_SECTIONS]
          const filteredOrder = merged.sectionOrder.filter((id): id is SectionId =>
            validSectionIds.includes(id as SectionId),
          )

          // Add any missing sections to the end
          validSectionIds.forEach((id) => {
            if (!filteredOrder.includes(id)) {
              filteredOrder.push(id)
            }
          })

          merged.sectionOrder = filteredOrder
        }

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
