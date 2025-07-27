import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import 'non.geist'
import './index.css'
import { AppRouter } from '@/router.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'
import { themeActions } from '@/stores/theme-store.ts'
const { initializeTheme } = themeActions

const themeStorage = new LocalConfigStorage('theme')
initializeTheme(themeStorage, 'class')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter/>
  </StrictMode>,
)
