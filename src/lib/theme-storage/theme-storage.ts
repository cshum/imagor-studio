export interface ThemeStorage {
  loadTheme(): Promise<string | null>;
  saveTheme(theme: string): Promise<void>;
}
