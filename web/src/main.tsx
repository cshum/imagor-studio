import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n'
import 'non.geist'
import './index.css'

import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'
import { AppRouter } from '@/router.tsx'
import { scrollPositionActions } from '@/stores/scroll-position-store.ts'
import { themeActions } from '@/stores/theme-store.ts'

const { initializeTheme } = themeActions
const { initializeScrollPositions } = scrollPositionActions

initializeTheme(new LocalConfigStorage('theme'), 'class')
initializeScrollPositions(new SessionConfigStorage('scroll_positions'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
