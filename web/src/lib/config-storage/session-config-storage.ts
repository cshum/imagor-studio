import { ConfigStorage } from '@/lib/config-storage/config-storage.ts'

export class SessionConfigStorage implements ConfigStorage {
  storageKey: string

  constructor(storageKey: string) {
    this.storageKey = storageKey
  }

  async get(): Promise<string | null> {
    return sessionStorage.getItem(this.storageKey)
  }

  async set(value: string): Promise<void> {
    sessionStorage.setItem(this.storageKey, value)
  }
}
