import i18n from '@/i18n'
import { UserRegistryConfigStorage } from '@/lib/config-storage/user-registry-config-storage'

const userLocaleStorage = new UserRegistryConfigStorage('app_default_language')

/**
 * Apply the resolved locale if it differs from the current i18n language.
 */
export const initializeLocale = async (locale?: string | null) => {
  try {
    if (locale && locale !== i18n.language) {
      await i18n.changeLanguage(locale)
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
