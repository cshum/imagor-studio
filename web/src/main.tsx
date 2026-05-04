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

import { bootstrapRootLoaderData } from '@/loaders/root-loader.ts'
import { AppRouter } from '@/router.tsx'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

const root = createRoot(rootElement)

async function bootstrap() {
  try {
    await bootstrapRootLoaderData()
  } catch {
    // Fall through and let the mounted app render its own error states.
  }

  root.render(
    <StrictMode>
      <AppRouter />
    </StrictMode>,
  )
}

void bootstrap()
