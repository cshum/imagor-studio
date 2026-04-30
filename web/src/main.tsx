import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './i18n'
import '@fontsource/dejavu-sans/400.css'
import '@fontsource/dejavu-sans/400-italic.css'
import '@fontsource/dejavu-sans/700.css'
import '@fontsource/dejavu-sans/700-italic.css'
import '@fontsource/dejavu-serif/400.css'
import '@fontsource/dejavu-serif/400-italic.css'
import '@fontsource/dejavu-serif/700.css'
import '@fontsource/dejavu-serif/700-italic.css'
import '@fontsource/dejavu-mono/400.css'
import '@fontsource/dejavu-mono/700.css'
import 'non.geist'
import './index.css'

import { AppRouter } from '@/router.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
