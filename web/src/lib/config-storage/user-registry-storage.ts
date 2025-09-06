import { deleteUserRegistry, getUserRegistry, setUserRegistry } from '@/api/registry-api'

import { ConfigStorage } from './config-storage'

export class UserRegistryStorage implements ConfigStorage {
  private readonly registryKey: string
  private fallbackStorage: ConfigStorage

  constructor(registryKey: string, fallbackStorage: ConfigStorage) {
    this.registryKey = `user.${registryKey}` // Prefix to avoid conflicts
    this.fallbackStorage = fallbackStorage
  }

  async get(): Promise<string | null> {
    try {
      // First check user registry
      const registryEntries = await getUserRegistry(this.registryKey)
      if (registryEntries && registryEntries.length > 0) {
        const entry = registryEntries[0]
        return entry.value || null
      }

      // If not in registry, check fallback storage for migration
      const fallbackValue = await this.fallbackStorage.get()
      if (fallbackValue) {
        // Migrate to user registry
        await setUserRegistry(this.registryKey, fallbackValue)
        // Clean up fallback storage
        await this.fallbackStorage.remove()
        return fallbackValue
      }

      return null
    } catch (error) {
      console.warn(
        `Failed to get user registry value for ${this.registryKey}, falling back to local storage:`,
        error,
      )
      // Fallback to fallback storage on API errors
      return this.fallbackStorage.get()
    }
  }

  async set(value: string): Promise<void> {
    try {
      await setUserRegistry(this.registryKey, value)
    } catch (error) {
      console.warn(
        `Failed to set user registry value for ${this.registryKey}, falling back to local storage:`,
        error,
      )
      // Fallback to fallback storage on API errors
      await this.fallbackStorage.set(value)
    }
  }

  async remove(): Promise<void> {
    try {
      await deleteUserRegistry(this.registryKey)
    } catch (error) {
      console.warn(
        `Failed to remove user registry value for ${this.registryKey}, falling back to local storage:`,
        error,
      )
      // Fallback to fallback storage on API errors
      await this.fallbackStorage.remove()
    }
  }
}
