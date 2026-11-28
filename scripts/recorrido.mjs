// Recorrido visual de Bambú (v11.5). Uso: node scripts/recorrido.mjs <carpeta_salida> [etiqueta]
// Playwright vive fuera del repo en C:/dev/_tools/playwright (en %TEMP% se borraba solo). Otra ruta: BAMBU_TOOLS.
// Siembra datos de prueba, fija el reloj de día y captura las pantallas principales a 390, 320 y 1280 px.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

const require = createRequire((process.env.BAMBU_TOOLS || 'C:/dev/_tools/playwright') + '/package.json')
const { chromium } = require('playwright')
const out = process.argv[2], tag = process.argv[3] || 'v'
await mkdir(out, { recursive: true })
const server = await createServer({ configFile: false, envDir: false, envPrefix: 'BAMBU_AUDIT_UNUSED_', plugins: [react()], server: { host: '127.0.0.1', port: 5179, strictPort: true }, define: { 'import.meta.env.VITE_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined' } })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const errors = []
try {
  for (const width of [390, 320, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: width > 900 ? 860 : 844 }, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: 'reduce' })
    await context.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort())
    const page = await context.newPage()
    page.on('pageerror', e => errors.push(`${width} ${e.message}`))
    await page.clock.setFixedTime(new Date('2026-11-27T10:30:00-06:00'))
    await page.goto('http://127.0.0.1:5179')
    await page.evaluate(async () => {
      const { normalizeData, EMPTY_DATA } = await import('/src/lib/model.ts')
      const { setStorageScope, saveAppData } = await import('/src/lib/storage.ts')
      setStorageScope('local')
      const data = normalizeData({ ...EMPTY_DATA, profile: { name: 'Gael', north: 'Alguien constante', onboardingComplete: true },
        settings: { ...EMPTY_DATA.settings, age: 13, footballDays: [1, 3, 5], habits: [{ id: 'leer', label: 'Leer 20 minutos', mark: 'L' }, { id: 'orden', label: 'Preparar mochila', mark: 'M' }] },
        tasks: [{ id: 't1', text: 'Exposición de ciencias', status: 'pending', minutes: 25, updatedAt: Date.now() }],
        reading: [{ id: 'r1', day: '2026-11-26', minutes: 20, note: '' }],
        checkins: [{ id: '2026-11-27', day: '2026-11-27', capacity: 70 }],
        sets: [['2026-11-20', 'pushup', 12], ['2026-11-20', 'pushup', 10], ['2026-11-22', 'squat', 20], ['2026-11-24', 'pullup-negative', 5], ['2026-11-25', 'pushup', 14], ['2026-11-26', 'backpack-hold', 0, 40]].map(([day, exercise, reps, seconds], i) => ({ id: 's' + i, day, at: Date.parse(day + 'T18:00:00'), exercise, ...(seconds ? { seconds } : { reps }), rir: 1 })),
        meals: [{ id: 'm1', day: '2026-11-27', at: Date.parse('2026-11-27T08:00:00'), slot: 'desayuno', items: [{ name: 'Huevo', qty: 2, unit: 'pieza', kcal: 144, protein: 12.6, group: 'proteina', foodId: 'huevo' }, { name: 'Tortilla de maíz', qty: 3, unit: 'pieza', kcal: 195, protein: 5.1, group: 'cereal', foodId: 'tortilla' }, { name: 'Jugo de naranja', qty: 1, unit: 'vaso', kcal: 112, protein: 1.7, group: 'bebida', foodId: 'jugo' }] }] })
      await saveAppData(data)
      localStorage.setItem('bambu.legacy-owner.v1', 'local')
    })
    await page.reload()
    await page.waitForTimeout(900)
    await page.evaluate(() => document.fonts.ready)
    const shot = async name => { await page.waitForTimeout(350); await page.screenshot({ path: join(out, `${tag}-${width}-${name}.png`), fullPage: !['estirar', 'Hoy-pantalla'].includes(name) }) }
    if (await page.locator('.d-scrim').count()) { if (width === 390) await shot('hoja-manana'); await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
    if (await page.locator('.d-scrim').count()) { const c = page.locator('.d-scrim').getByRole('button', { name: /Cerrar|Luego|Ahora no/ }).first(); if (await c.count()) await c.click() }
    const sections = width === 320 ? ['Hoy'] : width > 900 ? ['Hoy'] : (process.env.SECCIONES ? process.env.SECCIONES.split(',') : ['Hoy', 'Entrenar', 'Lectura', 'Tareas', 'Comida', 'Jardín', 'Ajustes'])
    for (const s of sections) {
      if (s === 'Comida') { await page.goto('http://127.0.0.1:5179/?ir=comida'); await page.waitForTimeout(900); if (await page.locator('.d-scrim').count()) await page.keyboard.press('Escape') }
      else if (s === 'Ajustes') await page.getByRole('button', { name: 'Ajustes', exact: true }).first().click()
      else if (width < 900) await page.locator('.bottom-nav').getByRole('button', { name: s, exact: true }).click()
      await shot(s)
      if (s === 'Hoy') await shot('Hoy-pantalla')
      if (s === 'Entrenar' && width === 390) {
        const go = page.getByRole('button', { name: /Empezar|Entrenar ahora|Comenzar|Iniciar sesión guiada/ }).first()
        if (await go.count()) { await go.click().catch(() => {}); await page.waitForTimeout(600); await shot('Entrenar-sesion'); console.log('una mano visible:', await page.getByText('Una mano a la vez').count()); const m = page.locator('.set-logger').first(); if (await m.count()) { await m.scrollIntoViewIfNeeded(); await m.screenshot({ path: join(out, `${tag}-390-una-mano.png`) }) } }
      }
      if (s === 'Ajustes') { const w = page.locator('.d-card', { hasText: 'Widget en tu pantalla' }); if (await w.count()) await w.screenshot({ path: join(out, `${tag}-${width}-widget.png`) }); else errors.push('no hay tarjeta de widget en Ajustes') }
    }
    if (width === 390 && process.env.FESTEJO) {
      await page.evaluate(async () => { const { celebrate } = await import('/src/ui.tsx'); celebrate({ kind: 'meta', title: '¡Llegaste a tu energía para crecer!', text: '2450 kcal. Tu cuerpo tiene con qué entrenar, crecer y recuperarse.', extra: 'Y también tu proteína: 92 g' }) })
      await page.waitForTimeout(1600); await page.screenshot({ path: join(out, `${tag}-390-festejo-comida.png`) }); await page.keyboard.press('Escape'); await page.mouse.click(10, 10)
    }
    if (width === 390) {
      await page.evaluate(async () => { const { openStretch } = await import('/src/lib/stretch.ts'); openStretch('noche') })
      await shot('estirar-intro')
      await page.locator('.st-go').click()
      await shot('estirar')
    }
    await context.close()
  }
  console.log(errors.length ? errors.join('\n') : 'sin errores de página')
} finally { await browser.close(); await server.close() }
