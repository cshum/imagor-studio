import React from 'react'
import ReactDOM from 'react-dom/client'
import { EmbeddedApp } from './app'
import '../index.css'
import '../scrollbar.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EmbeddedApp />
  </React.StrictMode>,
)
