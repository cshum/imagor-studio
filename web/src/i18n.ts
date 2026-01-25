import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'

import enTranslations from '@/locales/en.json'
import zhCNTranslations from '@/locales/zh-CN.json'
import zhTWTranslations from '@/locales/zh-TW.json'

const resources = {
  en: {
    translation: enTranslations,
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
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
] as const

export type LanguageCode = (typeof availableLanguages)[number]['code']

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already safes from XSS
  },
})

export default i18n
