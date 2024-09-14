import { ConfigStorage } from '@/lib/config-storage/config-storage.ts'

export class LocalConfigStorage implements ConfigStorage {
  storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  async get(): Promise<string | null> {
    return localStorage.getItem(this.storageKey)
  }

  async set(theme: string): Promise<void> {
    localStorage.setItem(this.storageKey, theme)
  }
}
