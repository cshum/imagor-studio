import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n'
import 'non.geist'
import './index.css'

import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { AppRouter } from '@/router.tsx'
import { initAuth } from '@/stores/auth-store.ts'
import { initializeScrollPositions } from '@/stores/scroll-position-store.ts'
import { initializeTheme } from '@/stores/theme-store.ts'

initializeTheme(new LocalConfigStorage('theme'), 'class')
initializeScrollPositions(new SessionConfigStorage('scroll_positions'))
initAuth()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
