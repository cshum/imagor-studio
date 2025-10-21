import { ConfigStorage } from '@/lib/config-storage/config-storage'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage'
import { MemoryConfigStorage } from '@/lib/config-storage/memory-config-storage'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'
import type { Auth } from '@/stores/auth-store'

export interface EditorOpenSections {
  dimensions: boolean
  output: boolean
  crop: boolean
  effects: boolean
  transform: boolean
}

const defaultOpenSections: EditorOpenSections = {
  dimensions: true,
  output: false,
  crop: false,
  effects: false,
  transform: false,
}

export class EditorOpenSectionsStorage {
  private storage: ConfigStorage

  constructor(auth: Auth) {
    if (auth.isEmbedded) {
      // Embedded mode: completely stateless
      this.storage = new MemoryConfigStorage()
    } else {
      // Non-embedded mode: use localStorage with user registry fallback for migration
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
        return { ...defaultOpenSections, ...savedSections }
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
