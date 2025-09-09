import i18n from '@/i18n'
import { ConfigStorage } from '@/lib/config-storage/config-storage'

let storage: ConfigStorage | null = null

/**
 * Initialize locale system with storage
 */
export const initializeLocale = async (configStorage: ConfigStorage) => {
  storage = configStorage
  try {
    const storedLocale = await configStorage.get()
    if (storedLocale && storedLocale !== i18n.language) {
      await i18n.changeLanguage(storedLocale)
    }
  } catch {
    // i18next continues with default behavior
  }
}

/**
 * Set locale and save to storage
 */
export const setLocale = async (locale: string) => {
  if (locale !== i18n.language) {
    await i18n.changeLanguage(locale)
  }
  await storage?.set(locale)
}

/**
 * Hook for components to use locale functionality
 */
export const useLocale = () => {
  return {
    currentLanguage: i18n.language,
    setLocale,
  }
}
