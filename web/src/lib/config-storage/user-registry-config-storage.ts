import { deleteUserRegistry, getUserRegistry, setUserRegistry } from '@/api/registry-api'

import { ConfigStorage } from './config-storage'

export class UserRegistryConfigStorage implements ConfigStorage {
  private readonly registryKey: string
  private fallbackStorage?: ConfigStorage

  constructor(registryKey: string, fallbackStorage?: ConfigStorage) {
    this.registryKey = `config.${registryKey}` // Prefix to avoid conflicts
    this.fallbackStorage = fallbackStorage
  }

  async get(): Promise<string | null> {
    return await this.fetchFromAPI()
  }

  private async fetchFromAPI(): Promise<string | null> {
    try {
      // First check user registry
      const registryEntries = await getUserRegistry(this.registryKey)
      if (registryEntries && registryEntries.length > 0) {
        const entry = registryEntries[0]
        return entry.value || null
      }

      // Check fallback and migrate if found
      const fallbackValue = await this.fallbackStorage?.get()
      if (fallbackValue) {
        // Migrate to user registry
        await setUserRegistry(this.registryKey, fallbackValue)
        // Clean up fallback storage
        await this.fallbackStorage?.remove()
        return fallbackValue
      }

      return null
    } catch {
      // Silent fallback if fallbackStorage is provided
      return this.fallbackStorage?.get() ?? null
    }
  }

  async set(value: string): Promise<void> {
    try {
      await setUserRegistry(this.registryKey, value)
    } catch {
      // Silent fallback if fallbackStorage is provided
      await this.fallbackStorage?.set(value)
    }
  }

  async remove(): Promise<void> {
    try {
      await deleteUserRegistry(this.registryKey)
    } catch {
      // Silent fallback if fallbackStorage is provided
      await this.fallbackStorage?.remove()
    }
  }
}
