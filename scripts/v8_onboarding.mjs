import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(join(process.env.TEMP, 'bambu-v7-tools', 'package.json'))
const { chromium } = require('playwright')
const server = await createServer({ configFile: false, envDir: false, envPrefix: 'BAMBU_AUDIT_UNUSED_', plugins: [react()], server: { host: '127.0.0.1', port: 5180 }, define: { 'import.meta.env.VITE_SUPABASE_URL': 'undefined', 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': 'undefined' } })
await server.listen()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const phase = process.argv[2] || 'after'
try {
  for (const width of [360,390]) for (const theme of ['light','dark']) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' })
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
    const errors = []; page.on('pageerror', e => errors.push(e.message))
    const start = Date.now()
    await page.goto('http://127.0.0.1:5180')
    await page.locator('.ob').waitFor()
    await page.screenshot({ path: `docs/v8/${phase}-${width}-${theme}-bienvenida.png`, fullPage: true })
    if (phase === 'after') {
      await page.getByLabel('Tu nombre').fill('Prueba')
      await page.getByRole('button', { name: 'Elegir mi primer paso' }).click()
      await page.getByRole('button', { name: 'Tomar agua', exact: true }).click()
      await page.getByRole('button', { name: 'Ya lo hice', exact: true }).click()
      await page.screenshot({ path: `docs/v8/${phase}-${width}-${theme}-primer-paso.png`, fullPage: true })
      await page.getByRole('button', { name: 'Guardar y entrar' }).click()
      await page.locator('.hero').waitFor()
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('bambu.app.v3.local') || '{}').profile?.onboardingComplete)
      const saved = await page.evaluate(async () => {
        const { loadAppData } = await import('/src/lib/storage.ts')
        const { dateKey } = await import('/src/lib/model.ts')
        const { data } = await loadAppData()
        return { votes: data.habits[dateKey()], complete: data.profile.onboardingComplete }
      })
      assert.deepEqual(saved.votes, ['agua'])
      assert.equal(saved.complete, true)
      assert.ok(Date.now() - start < 60000)
      assert.deepEqual(errors, [])
      console.log(`Onboarding ${width} ${theme}: saved real confirmation in ${Date.now()-start}ms`)
    }
    await page.close()
  }
} finally { await browser.close(); await server.close() }
