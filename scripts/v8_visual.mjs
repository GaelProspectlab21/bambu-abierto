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
await mkdir('docs/v8', { recursive: true })
try {
  for (const width of [360, 390]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: 'reduce' })
    await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
    const page = await context.newPage(), errors = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', m => { if(m.type()==='error') errors.push(m.text()) })
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

    const inspect = () => page.evaluate(() => {
      const visible = e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden';
      const clipped = [...document.querySelectorAll('h1,h2,h3,button,label,p')].filter(e => visible(e) && !e.matches('.companion-fab') && e.scrollWidth > e.clientWidth + 3 && getComputedStyle(e).overflowX !== 'auto').map(e => ({tag:e.tagName, cls:e.className, text:e.textContent.slice(0,90)}));
      const rgb = c => { const a=c.match(/[\d.]+/g)?.slice(0,3).map(Number); return c.startsWith('color(') ? a.map(v=>v*255) : a };
      const lum = c => rgb(c).map(v => { v/=255; return v<=.04045?v/12.92:((v+.055)/1.055)**2.4 }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
      const contrast = (a,b) => (Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      const pairs = [['--on-accent','--accent'],['--on-accent','--accent-deep'],['--ink','--surface'],['--body','--surface'],['--muted','--surface'],['--gold','--gold-wash'],['--on-commit','--commit']];
      const probe = document.createElement('span'); document.body.append(probe);
      const resolve = v => {probe.style.color=`var(${v})`; return getComputedStyle(probe).color};
      const tokens = pairs.map(([fg,bg])=>({fg,bg,ratio: +contrast(resolve(fg),resolve(bg)).toFixed(2)})); probe.remove();
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      const failures = [...document.querySelectorAll('button,button span,button strong,.chip,.habit-check,.ob-checklist i')].filter(visible).flatMap(e=>{
        const c=getComputedStyle(e); if(c.opacity!=='1'||e.closest(':disabled'))return [];
        let p=e,bg; while(p){bg=getComputedStyle(p).backgroundColor; if(!bg.endsWith(', 0)')&&bg!=='transparent')break;p=p.parentElement}
        if(!p || !e.textContent.trim())return [];
        const ratio=contrast(c.color,bg);
        return ratio<4.5?[{cls:e.className,text:e.textContent.slice(0,60),fg:c.color,bg,ratio:+ratio.toFixed(2)}]:[];
      });
      return {overflow:document.documentElement.scrollWidth>innerWidth,clipped,tokens,failures};
    });
    for (const section of ['Hoy','Lectura','Entrenar','Tareas','Comida','Noche','H\u00e1bitos','Historial','Ajustes']) {
      if(['Hoy','Lectura','Entrenar','Tareas'].includes(section)) await page.locator('.bottom-nav').getByRole('button',{name:section,exact:true}).click();
      else {await page.getByRole('button',{name:'M\u00e1s secciones'}).click();await page.getByRole('menuitem',{name:section,exact:true}).click();}
      await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:`docs/v8/${phase}-${width}-${theme}-${section}.png`,fullPage:true});
      reports.push({width,theme,section,...await inspect()});
      if(section==='Tareas') { const tab=page.getByRole('tab',{name:/Bloque en curso|Preparar bloque/}); if(await tab.count()){await tab.click();await page.screenshot({path:`docs/v8/${phase}-${width}-${theme}-Enfoque.png`,fullPage:true});reports.push({width,theme,section:'Enfoque',...await inspect()})} }
    }
    await page.getByRole('button',{name:'Registrar en un toque'}).click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({path:`docs/v8/${phase}-${width}-${theme}-hoja.png`});
    reports.push({width,theme,section:'Registro',...await inspect(),errors});
    await context.close();
  }
  await writeFile(`docs/v8/${phase}-auditoria.json`,JSON.stringify(reports,null,2));
  console.log(JSON.stringify(reports.map(r=>({width:r.width,theme:r.theme,section:r.section,overflow:r.overflow,clipped:r.clipped,failures:r.failures})),null,2));
  if(phase==='after') {assert.ok(reports.every(r=>!r.overflow&&!r.clipped.length),'overflow/clipped');assert.ok(reports.every(r=>!r.errors?.length),'console errors');assert.ok(reports.every(r=>r.tokens.every(t=>t.ratio>=4.5)),'token contrast');assert.ok(reports.every(r=>!r.failures.length),'control contrast')}
} finally {await browser.close();await server.close()}
