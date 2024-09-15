import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Common
      home: 'Home',
      posts: 'Posts',
      categories: 'Categories',
      tags: 'Tags',
      users: 'Users',
      account: 'Account',
      signOut: 'Sign out',

      // Titles
      allPosts: 'All Posts',
      newPost: 'New Post',

      // User nav
      profile: 'Profile',
      dashboard: 'Dashboard',

      // Footer
      footerText:
        'Built on top of {{uiLink}}. The source code is available on {{githubLink}}.',

      // Placeholder
      placeholderImageAttribution: 'Designed by Freepik',

      // Button labels
      switchTheme: 'Switch Theme',
      close: 'Close',
      snooze: 'Snooze',
      replyAll: 'Reply all',
      forward: 'Forward',
      more: 'More',

      // Dropdown menu items
      markAsUnread: 'Mark as unread',
      starThread: 'Star thread',
      addLabel: 'Add label',
      muteThread: 'Mute thread',

      // Image info
      imageInformation: 'Image Information',
      noImageInfo: 'No image information available.',
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // use English if detected language is not available
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie'], // cache user language on
    },
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  })

export default i18n
