// Manual visual audit harness, not a replacement for checks/features.cjs.
// Install Playwright outside the repo: pnpm --dir "$env:TEMP/bambu-v7-tools" add playwright
// node scripts/v7_visual.mjs before|after
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const require = createRequire(join(process.env.TEMP, 'bambu-v7-tools', 'package.json'))
const { chromium } = require('playwright')
const phase = process.argv[2] || 'after'
const server = await createServer({ configFile: false, envDir: false, envPrefix: 'BAMBU_AUDIT_UNUSED_', plugins: [react()], server: { host: '127.0.0.1', port: 5179, strictPort: true }, define: { 'import.meta.env.VITE_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined' } })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const reports = []
await mkdir('docs/v7', { recursive: true })
try {
  for (const width of [360, 390]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' })
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    await page.clock.setFixedTime(new Date('2026-11-23T08:30:00-06:00'))
    await page.goto('http://127.0.0.1:5179')
    await page.evaluate(async () => {
      const { normalizeData, EMPTY_DATA } = await import('/src/lib/model.ts')
      const { setStorageScope, saveAppData } = await import('/src/lib/storage.ts')
      setStorageScope('local')
      const data = normalizeData({ ...EMPTY_DATA, profile: { name: 'Prueba visual', north: 'Alguien constante', onboardingComplete: true },
        settings: { ...EMPTY_DATA.settings, age: 13, footballDays: [1,3,5], habits: [{ id: 'leer', label: 'Leer con atención y anotar una idea que pueda usar hoy', mark: 'L' }, { id: 'orden', label: 'Preparar mochila', mark: 'M' }] },
        activeReading: { id: 'visual-reading', day: '2026-11-23', startedAt: Date.now() - 300000, title: 'Libro de prueba', location: '' },
        activeFocus: { id: 'visual-focus', day: '2026-11-23', task: 'Preparar la exposición de ciencias y repasar los apuntes de la semana', startedAt: Date.now() - 600000, minutes: 25, phase: 'focus', level: 2 },
        tasks: [{ id: 'visual-task', text: 'Preparar la exposición de ciencias y repasar los apuntes de la semana', status: 'pending', minutes: 25, updatedAt: Date.now() }],
        checkins: [{ id: '2026-11-23', day: '2026-11-23', capacity: 70 }] })
      await saveAppData(data)
      localStorage.setItem('bambu.legacy-owner.v1', 'local')
      localStorage.setItem('bambu.tip.plus', '0')
    })
    await page.reload()
    await page.locator('.hero').waitFor()
    await page.evaluate(() => document.fonts.ready)
    const prefix = `docs/v7/${phase}-${width}-${theme}`
    await page.screenshot({ path: `${prefix}-hoy.png`, fullPage: true })
    const inspect = () => page.evaluate(() => {
      const box = selector => { const e = document.querySelector(selector); if (!e || !e.getClientRects().length || getComputedStyle(e).display === 'none') return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right } }
      const intersects = (a, b) => !!a && !!b && a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y
      const companion = box('.companion-fab'), tip = box('.plus-tip'), audio = box('.audio-mini'), plus = box('.nav-plus')
      return { overflow: document.documentElement.scrollWidth > innerWidth, companionTip: intersects(companion, tip), audioPlus: intersects(audio, plus), audioCompanion: intersects(audio, companion), heroBeforeStats: document.querySelector('.hero').compareDocumentPosition(document.querySelector('.top-stats')) === Node.DOCUMENT_POSITION_FOLLOWING,
        sectionGap: getComputedStyle(document.querySelector('.section-in')).rowGap,
        clockNoWrap: [...document.querySelectorAll('.live-bar strong')].every(e => getComputedStyle(e).whiteSpace === 'nowrap'),
        clipped: [...document.querySelectorAll('.hero h1,.hero h2,.today-card h2,.live-bar button,.habit-row')].filter(e => e.scrollWidth > e.clientWidth + 2).map(e => e.className) }
    })
    const initial = await inspect()
    if (phase === 'after') {
      await page.locator('.live-bar').scrollIntoViewIfNeeded()
      await page.screenshot({ path: `${prefix}-sesiones.png` })
      await page.evaluate(() => window.scrollTo(0, 0))
    }
    await page.getByRole('button', { name: 'Registrar en un toque' }).click()
    await page.getByRole('dialog').waitFor()
    await page.screenshot({ path: `${prefix}-hoja.png` })
    await page.keyboard.press('Escape')
    // Start through a real user gesture, then navigate and unmount the reading panel.
    await page.locator('.bottom-nav').getByRole('button', { name: 'Lectura', exact: true }).click()
    await page.getByRole('button', { name: 'Reproducir audio', exact: true }).click()
    await page.getByRole('button', { name: 'Pausar audio', exact: true }).first().waitFor()
    await page.getByRole('button', { name: 'Pausar', exact: true }).click()
    assert.equal(await page.evaluate(async () => (await import('/src/lib/audioEngine.ts')).audioEngine.getSnapshot().playing), true, 'pausing reading must preserve audio')
    await page.locator('.bottom-nav').getByRole('button', { name: 'Hoy', exact: true }).click()
    await page.locator('.audio-mini').waitFor()
    const audioPlaying = await page.evaluate(async () => (await import('/src/lib/audioEngine.ts')).audioEngine.getSnapshot().playing)
    assert.equal(audioPlaying, true, 'navigation must preserve playback')
    await page.screenshot({ path: `${prefix}-audio.png` })
    const withAudio = await inspect()
    await page.getByRole('button', { name: 'Registrar en un toque' }).click()
    await page.getByRole('dialog').waitFor()
    assert.equal(await page.locator('.audio-mini').evaluate(e => getComputedStyle(e).visibility), 'hidden')
    await page.keyboard.press('Escape')
    assert.equal(await page.evaluate(async () => (await import('/src/lib/audioEngine.ts')).audioEngine.getSnapshot().playing), true, 'closing a sheet must preserve audio')
    await page.getByRole('button', { name: 'Cerrar audio', exact: true }).click()
    // Check the growth view via the same application routing used by push links.
    await page.goto('http://127.0.0.1:5179/?ir=comida')
    await page.getByRole('heading', { name: 'Comida', exact: true }).waitFor()
    const foodText = await page.locator('main').innerText()
    assert.doesNotMatch(foodText, /\bkcal\b|Te pasaste|Cómo decide bambú|Tus medidas/)
    await page.getByRole('button', { name: 'Revisar mis hábitos de comida' }).click()
    await page.getByRole('button', { name: 'Tengo hambre seguido', exact: true }).click()
    await page.getByRole('button', { name: 'A veces', exact: true }).click()
    await page.getByRole('button', { name: 'Me canso más de lo normal', exact: true }).click()
    await page.getByRole('heading', { name: 'Una idea para hoy' }).waitFor()
    if (phase === 'after') {
      assert.equal(initial.overflow, false); assert.equal(initial.companionTip, false)
      assert.equal(initial.heroBeforeStats, true); assert.deepEqual(initial.clipped, [])
      assert.equal(withAudio.audioPlus, false); assert.equal(withAudio.audioCompanion, false)
      assert.equal(initial.sectionGap, '16px'); assert.equal(initial.clockNoWrap, true)
      assert.deepEqual(errors, [])
      await page.goto('http://127.0.0.1:5179/?estirar=noche')
      await page.getByRole('dialog', { name: 'Estiramiento: Antes de dormir' }).waitFor()
      await page.locator('.stretch-screen').getByRole('button', { name: 'Empezar', exact: false }).click()
      await page.locator('.stretch-photo img').waitFor()
      await page.waitForFunction(() => [...document.querySelectorAll('.stretch-photo img')].every(i => i.complete && i.naturalWidth > 0))
      await page.screenshot({ path: `${prefix}-estirar.png` })
      await page.getByRole('button', { name: 'Salir', exact: true }).click()
      await page.goto('http://127.0.0.1:5179/?ir=entrenar')
      await page.getByRole('button', { name: 'Empezar sesión guiada', exact: false }).click()
      await page.getByRole('button', { name: 'Guardar serie', exact: false }).click()
      await page.locator('.rest-mobility summary').click()
      await page.locator('.rest-mobility').scrollIntoViewIfNeeded()
      await page.waitForFunction(() => [...document.querySelectorAll('.rest-mobility img')].every(i => i.complete && i.naturalWidth > 0))
      await page.screenshot({ path: `${prefix}-descanso.png` })
      await page.getByRole('button', { name: 'Prefiero descansar' }).click()
      assert.equal(await page.locator('.rest-mobility').count(), 0)
      assert.equal(await page.locator('.rest-timer').count(), 1)
    }
    reports.push({ width, theme, initial, withAudio, audioPlaying, errors })
    await context.close()
  }
  await writeFile(`docs/v7/${phase}-auditoria.json`, JSON.stringify(reports, null, 2))
  console.log(JSON.stringify(reports, null, 2))
} finally { await browser.close(); await server.close() }
