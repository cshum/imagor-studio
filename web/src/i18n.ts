import { initReactI18next } from 'react-i18next'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Common
      common: {
        buttons: {
          save: 'Save',
          cancel: 'Cancel',
          delete: 'Delete',
          edit: 'Edit',
          create: 'Create',
          update: 'Update',
          close: 'Close',
          more: 'More',
          switchTheme: 'Switch Theme',
        },
        navigation: {
          home: 'Home',
          account: 'Account',
          profile: 'Profile',
          dashboard: 'Dashboard',
          users: 'Users',
          signOut: 'Sign Out',
          login: 'Login',
          accountSettings: 'Account Settings',
        },
        status: {
          loading: 'Loading...',
          error: 'Error',
          success: 'Success',
          guest: 'Guest',
          user: 'User',
        },
        labels: {
          email: 'Email',
          password: 'Password',
          name: 'Name',
          role: 'Role',
        },
      },

      // Authentication
      auth: {
        login: {
          title: 'Welcome back',
          subtitle: 'Enter your credentials to access Imagor Studio',
          signIn: 'Sign In',
          loginFailed: 'Login failed',
        },
        validation: {
          emailRequired: 'Please enter a valid email address',
          passwordRequired: 'Password is required',
          invalidEmail: 'Please enter a valid email address',
        },
      },

      // Forms
      forms: {
        placeholders: {
          enterEmail: 'Enter your email',
          enterPassword: 'Enter your password',
          enterName: 'Enter your name',
        },
        validation: {
          required: 'This field is required',
          invalidEmail: 'Please enter a valid email address',
          passwordTooShort: 'Password must be at least {{min}} characters',
          emailInvalid: 'Please enter a valid email address',
        },
      },

      // Navigation/Breadcrumbs
      navigation: {
        breadcrumbs: {
          home: 'Home',
          gallery: 'Gallery',
          profile: 'Profile',
          account: 'Account',
          settings: 'Settings',
          users: 'Users',
          admin: 'Admin',
          adminSetup: 'Admin Setup',
        },
      },

      // Pages
      pages: {
        gallery: {
          title: 'Gallery',
          noImages: 'No images found',
          noImagesInGallery: 'No images in your gallery',
          folderEmpty: 'This folder is empty',
        },
        profile: {
          title: 'Profile',
        },
        admin: {
          title: 'Admin',
          setup: 'Admin Setup',
          welcome: 'Welcome to Imagor Studio',
          setupDescription: "Let's get your image gallery set up in just a few steps",
          createAdminAccount: 'Create Admin Account',
          systemConfiguration: 'System Configuration',
          storageConfiguration: 'Storage Configuration',
          emailAddress: 'Email Address',
          password: 'Password',
          createAccount: 'Create Account',
          skipForNow: 'Skip for Now',
          next: 'Next',
          guestMode: 'Guest Mode',
          guestModeDescription: 'Allow users to browse the gallery without creating an account',
          systemSettingsDescription: 'These settings can be changed later in the admin panel.',
          storageDescription: 'Configure where your images will be stored',
          failedToCreateAccount: 'Failed to create admin account',
          failedToSaveSettings: 'Failed to save settings',
          storageConfiguredSuccess: 'Storage configured successfully!',
          storageConfiguredRestart:
            'Storage configured successfully! Please restart the server to apply changes.',
        },
      },

      // Legacy keys (keeping for backward compatibility)
      home: 'Home',
      posts: 'Posts',
      categories: 'Categories',
      tags: 'Tags',
      users: 'Users',
      account: 'Account',
      signOut: 'Sign out',
      allPosts: 'All Posts',
      newPost: 'New Post',
      profile: 'Profile',
      dashboard: 'Dashboard',
      footerText: 'Built on top of {{uiLink}}. The source code is available on {{githubLink}}.',
      placeholderImageAttribution: 'Designed by Freepik',
      switchTheme: 'Switch Theme',
      close: 'Close',
      snooze: 'Snooze',
      replyAll: 'Reply all',
      forward: 'Forward',
      more: 'More',
      markAsUnread: 'Mark as unread',
      starThread: 'Star thread',
      addLabel: 'Add label',
      muteThread: 'Mute thread',
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
      order: [
        'querystring',
        'cookie',
        'localStorage',
        'sessionStorage',
        'navigator',
        'htmlTag',
        'path',
        'subdomain',
      ],
      caches: ['localStorage', 'cookie'], // cache user language on
    },
    interpolation: {
      escapeValue: false, // React already safes from XSS
    },
  })

export default i18n
