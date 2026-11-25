// Client integration with fake public configuration. No real accounts or secrets.
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(join(process.env.TEMP, 'bambu-v7-tools', 'package.json'))
const { chromium } = require('playwright')
const html = '<div id="root"></div><script type="module" src="/audit-google.tsx"></script>'
const source = `import React from 'react'; import {createRoot} from 'react-dom/client';
import {AuthScreen} from '/src/AuthScreen.tsx'; import {GoogleAccount} from '/src/GoogleAccount.tsx';
import {supabase} from '/src/lib/supabase.ts';
import '/src/index.css'; import '/src/v8.css'; import '/src/tokens.css';
const p = new URLSearchParams(location.search); window.calls=[];
supabase.auth.getUserIdentities=async()=>({data:{identities:p.has('linked')?[{provider:'google'}]:[{provider:'email'}]},error:null});
for (const method of ['signInWithOAuth','linkIdentity']) supabase.auth[method]=async options=>{window.calls.push({method,options});return {data:{},error:p.has('fail')?new Error('fake'):null}};
createRoot(document.getElementById('root')).render(p.has('link') ? <GoogleAccount link onError={text=>document.getElementById('notice').textContent=text}/> : <AuthScreen recovery={false} onRecoveryComplete={()=>{}}/>);
const notice=document.createElement('p');notice.id='notice';document.body.append(notice);`
const server = await createServer({ configFile: false, envDir: false, plugins: [react(), { name: 'audit', configureServer(s) { s.middlewares.use(async(req,res,next)=>{if(req.url.startsWith('/audit?')){res.setHeader('Content-Type','text/html');res.end(await s.transformIndexHtml('/audit',html));return} next()}) }, resolveId(id) { if(id==='/audit-google.tsx') return id }, load(id) { if(id==='/audit-google.tsx') return source } }], define: { 'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://fake.supabase.co'), 'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('public-test-key') }, server: {host:'127.0.0.1',port:5181} })
await server.listen()
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
  for(const scenario of ['off','on','link','linked','fail','callback']) {
    const page=await browser.newPage({viewport:{width:390,height:844}})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    let settings=0
    await page.route('https://fake.supabase.co/**',route=>{
      if(route.request().url().endsWith('/settings')){settings++;return route.fulfill({json:{external:{google:scenario!=='off'}}})}
      return route.fulfill({status:400,json:{message:'Not used in client test'}})
    })
    await page.goto(`http://127.0.0.1:5181/audit?case=${scenario}${['link','linked'].includes(scenario)?'&link=1':''}${scenario==='linked'?'&linked=1':''}${scenario==='fail'?'&fail=1':''}${scenario==='callback'?'&error_description=denied&error=server_error':''}`)
    if(scenario==='off') {await page.waitForResponse(r=>r.url().endsWith('/settings')).catch(()=>{});assert.equal(await page.getByRole('button',{name:'Continuar con Google'}).count(),0)}
    else if(scenario==='linked') await page.getByText('Google vinculado').waitFor()
    else {
      const button=page.getByRole('button',{name:scenario==='link'?'Vincular Google':'Continuar con Google'})
      await button.waitFor()
      if(scenario==='callback') {await page.getByRole('alert').filter({hasText:'código de invitación'}).waitFor();assert.ok(!page.url().includes('error_description'))}
      await button.click()
      const calls=await page.evaluate(()=>window.calls)
      assert.equal(calls[0].method,scenario==='link'?'linkIdentity':'signInWithOAuth')
      assert.equal(calls[0].options.provider,'google')
      assert.equal(calls[0].options.options.redirectTo,`http://127.0.0.1:5181${scenario==='link'?'/?ir=ajustes':''}`)
      if(scenario==='fail') await page.getByRole('alert').filter({hasText:'correo y contraseña'}).waitFor()
    }
    assert.ok(settings>0); assert.deepEqual(errors,[])
    await page.screenshot({path:`docs/v8/google-${scenario}.png`,fullPage:true})
    console.log(`Google client: ${scenario} OK`)
    await page.close()
  }
} finally {await browser.close();await server.close()}
