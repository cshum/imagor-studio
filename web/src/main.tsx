import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import 'non.geist'
import './index.css'
import { AppRouter } from '@/router.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter/>
  </StrictMode>,
)
