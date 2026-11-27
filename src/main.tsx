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
import './v8.css'
// Último: los tokens de marca le ganan a cualquier definición vieja.
import './tokens.css'
import '@fontsource-variable/nunito/index.css'
import './duo.css'
import './bambu.css'
import { applyTheme, watchSystemTheme } from './lib/theme'

applyTheme()
watchSystemTheme()


// Modo sin señal, Biblia guardada y avisos de bambu-remind. Va relativo para servir también en una subcarpeta.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch((error: unknown) => {
    console.error('No se pudo activar el modo sin conexión.', error)
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
