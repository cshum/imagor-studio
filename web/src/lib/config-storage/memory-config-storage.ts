import { ConfigStorage } from '@/lib/config-storage/config-storage.ts'

export class MemoryConfigStorage implements ConfigStorage {
  private value: string | null = null

  async get(): Promise<string | null> {
    return this.value
  }

  async set(value: string): Promise<void> {
    this.value = value
  }

  async remove(): Promise<void> {
    this.value = null
  }
}
