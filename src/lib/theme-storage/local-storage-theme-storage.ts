import { ThemeStorage } from '@/lib/theme-storage/theme-storage.ts'

export class LocalStorageThemeStorage implements ThemeStorage {
  storageKey: string;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
  }

  async loadTheme(): Promise<string | null> {
    return localStorage.getItem(this.storageKey);
  }

  async saveTheme(theme: string): Promise<void> {
    localStorage.setItem(this.storageKey, theme);
  }
}
