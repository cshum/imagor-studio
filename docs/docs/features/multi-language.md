---
sidebar_position: 7
---

# Multi-Language Support

Imagor Studio interface is available in multiple languages.

## Supported Languages

- **English** - Default language
- **Chinese (Simplified)** - 简体中文
- **Chinese (Traditional)** - 繁體中文
- **Italian** - Italiano

## Language Selection

### First Time Setup

Choose your preferred language during initial setup:

- Language selector appears on first launch
- Selection is saved for future sessions

### Change Language

Switch languages anytime from the settings menu:

1. Open user menu (top right)
2. Select "Language" or "语言"
3. Choose your preferred language
4. Interface updates immediately

## Language Persistence

Your language preference is saved:

- Stored in browser local storage
- Persists across sessions
- Per-user setting (not system-wide)

## Translated Elements

The following interface elements are translated:

- Navigation menus
- Button labels
- Form fields and labels
- Dialog messages
- Error messages
- Tooltips
- Settings panels
- Editor controls

## Contributing Translations

Translations are stored in JSON files in the codebase. To contribute:

1. Fork the repository
2. Add or update translation files in `web/src/locales/`
3. Submit a pull request

Translation files follow the format:
```
web/src/locales/
  en.json       # English
  zh-CN.json    # Chinese (Simplified)
  zh-TW.json    # Chinese (Traditional)
  it.json       # Italian
```
