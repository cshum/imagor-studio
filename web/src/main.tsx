import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import 'non.geist'
import './index.css'
import { AppRouter } from '@/router.tsx'
import { LocalConfigStorage } from '@/lib/config-storage/local-config-storage.ts'
import { themeActions } from '@/stores/theme-store.ts'
import { scrollPositionActions } from '@/stores/scroll-position-store.ts'
import { SessionConfigStorage } from '@/lib/config-storage/session-config-storage.ts'

const { initializeTheme } = themeActions
const { initializeScrollPositions } = scrollPositionActions

initializeTheme(new LocalConfigStorage('theme'), 'class')
initializeScrollPositions(new SessionConfigStorage('scroll_positions'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter/>
  </StrictMode>,
)
