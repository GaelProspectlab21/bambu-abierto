// Exporta a .wav los sonidos de Bambú para oírlos sin abrir la app. Uso: node scripts/muestras_sonido.mjs
// Renderiza cada partitura de src/lib/sounds.ts en un OfflineAudioContext (no suena nada) y la guarda en producto/sonidos.
import { createServer } from 'vite'
import { createRequire } from 'node:module'
import { writeFile, mkdir } from 'node:fs/promises'

const require = createRequire((process.env.BAMBU_TOOLS || 'C:/dev/_tools/playwright') + '/package.json')
const { chromium } = require('playwright')
const MUESTRAS = [
  ['12_estirar_empezar', 'stretchIn'], ['13_estirar_cuenta_3_2_1', 'count'], ['14_estirar_postura_nueva', 'pose'],
  ['15_estirar_lado_izquierdo', 'sideL'], ['16_estirar_lado_derecho', 'sideR'], ['17_estirar_suelta_el_aire', 'breathe'],
  ['18_estirar_terminaste', 'stretchDone'], ['19_pausa', 'pause'], ['20_seguir', 'resume'], ['21_va_fin_del_descanso', 'go'],
  ['22_elegir_respuesta', 'pick'], ['23_tocar_a_brote', 'pop'], ['24_sapo_del_dia', 'ribbit'],
]
const server = await createServer({ configFile: false, envDir: false, envPrefix: 'BAMBU_AUDIT_UNUSED_', server: { host: '127.0.0.1', port: 5181, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge' })
try {
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5181/')
  await mkdir('producto/sonidos', { recursive: true })
  for (const [nombre, kind] of MUESTRAS) {
    const b64 = await page.evaluate(async kind => {
      const { scheduleScore } = await import('/src/lib/sounds.ts')
      const sr = 44100, secs = kind === 'count' ? 3.2 : 4
      const ctx = new OfflineAudioContext(2, sr * secs, sr)
      // La cuenta se oye como en la app: 3, 2, 1, un segundo entre cada una.
      if (kind === 'count') [0, 1, 2].forEach(s => scheduleScore(ctx, 'count', .05 + s))
      else scheduleScore(ctx, kind, .05)
      const buf = await ctx.startRendering()
      const n = buf.length, data = new DataView(new ArrayBuffer(44 + n * 4))
      const str = (o, t) => [...t].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)))
      str(0, 'RIFF'); data.setUint32(4, 36 + n * 4, true); str(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 2, true)
      data.setUint32(24, sr, true); data.setUint32(28, sr * 4, true); data.setUint16(32, 4, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, n * 4, true)
      const L = buf.getChannelData(0), R = buf.getChannelData(1)
      for (let i = 0; i < n; i++) { data.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); data.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true) }
      let s = ''; const bytes = new Uint8Array(data.buffer); for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768))
      return btoa(s)
    }, kind)
    await writeFile(`producto/sonidos/${nombre}.wav`, Buffer.from(b64, 'base64'))
    console.log('escrito', nombre)
  }
} finally { await browser.close(); await server.close() }
