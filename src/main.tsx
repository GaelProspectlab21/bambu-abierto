import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Fraunces con el eje SOFT: serifa redondeada para títulos y números. Auto-hospedada (la CSP solo deja fuentes propias).
import '@fontsource-variable/fraunces/soft.css'
import './index.css'
import './features.css'
import './app.css'
import './brote.css'
import './v4.css'
import './v5.css'
import './v6.css'
import './v7.css'
// Último: los tokens de marca le ganan a cualquier definición vieja.
import './tokens.css'
import { applyTheme, watchSystemTheme } from './lib/theme'

applyTheme()
watchSystemTheme()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
    console.error('No se pudo activar el modo sin conexión.', error)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
