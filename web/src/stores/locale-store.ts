import { getSystemRegistry } from '@/api/registry-api'
import i18n from '@/i18n'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'

const userLocaleStorage = new UserRegistryConfigStorage('app_default_language')

/**
 * Initialize locale system
 * Priority: User registry > System registry (read-only default) > Default ('en')
 */
export const initializeLocale = async () => {
  try {
    // Try to get from user registry first
    let storedLocale = await userLocaleStorage.get()

    // If not found in user registry, check system registry as a default
    if (!storedLocale) {
      try {
        const systemRegistryEntries = await getSystemRegistry('config.app_default_language')
        if (systemRegistryEntries && systemRegistryEntries.length > 0) {
          storedLocale = systemRegistryEntries[0].value || null
        }
      } catch {
        // System registry fetch failed, will use i18n default
      }
    }

    if (storedLocale && storedLocale !== i18n.language) {
      await i18n.changeLanguage(storedLocale)
    }
  } catch {
    // i18next continues with default behavior
  }
}

/**
 * Set locale and save to user registry
 */
export const setLocale = async (locale: string) => {
  if (locale !== i18n.language) {
    await i18n.changeLanguage(locale)
  }
  await userLocaleStorage.set(locale)
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
