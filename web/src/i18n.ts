import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

import enTranslations from '@/locales/en.json'
import itTranslations from '@/locales/it.json'
import zhCNTranslations from '@/locales/zh-CN.json'
import zhTWTranslations from '@/locales/zh-TW.json'

const resources = {
  en: {
    translation: enTranslations,
  },
  it: {
    translation: itTranslations,
  },
  'zh-CN': {
    translation: zhCNTranslations,
  },
  'zh-TW': {
    translation: zhTWTranslations,
  },
}

// Available languages for the language selector
export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'it', name: 'Italiano' },
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
] as const

export type LanguageCode = (typeof availableLanguages)[number]['code']

/**
 * Get array of language codes for use in select options
 */
export const getLanguageCodes = (): string[] => {
  return availableLanguages.map((lang) => lang.code)
}

/**
 * Get language labels object for use in select option labels
 */
export const getLanguageLabels = (): Record<string, string> => {
  return Object.fromEntries(availableLanguages.map((lang) => [lang.code, lang.name]))
}

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
})

export default i18n
