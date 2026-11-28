// Genera los PNG del ícono desde public/icon.svg. Uso: node scripts/iconos.cjs
// Playwright vive fuera del repo en C:/dev/_tools/playwright (en %TEMP% se borraba solo). Otra ruta: BAMBU_TOOLS.
// En v11.1 los PNG salieron como capturas de una imagen rota (1 KB, blanco) y el iPhone nunca mostró el ícono: por eso este script mide lo que escribe.
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { chromium } = createRequire((process.env.BAMBU_TOOLS || 'C:/dev/_tools/playwright') + '/package.json')('playwright')

const PUB = path.join(__dirname, '../public')
const svg = fs.readFileSync(path.join(PUB, 'icon.svg'), 'utf8')
// Cuadrado completo: iOS y Android recortan las esquinas por su cuenta.
const lleno = svg.replace('rx="112"', 'rx="0"')
// Maskable: Android puede recortar en círculo; el dibujo cabe en el 80 % del centro.
const fin = lleno.indexOf('>', lleno.indexOf('<rect')) + 1, cierre = lleno.slice(fin).startsWith('</rect>') ? fin + 7 : fin
const seguro = lleno.slice(0, cierre) + '<g transform="translate(256 256) scale(.8) translate(-256 -256)">' + lleno.slice(cierre, lleno.lastIndexOf('</svg>')) + '</g></svg>'

const SALIDAS = [
  ['apple-touch-icon.png', lleno, 180, false],
  ['apple-touch-icon-v2.png', lleno, 180, false],
  ['icon-192.png', svg, 192, true],
  ['icon-512.png', svg, 512, true],
  ['icon-maskable-512.png', seguro, 512, false],
]

;(async () => {
  const browser = await chromium.launch({ channel: 'msedge' })
  try {
    for (const [nombre, dibujo, lado, transparente] of SALIDAS) {
      const page = await browser.newPage({ viewport: { width: lado, height: lado } })
      await page.setContent(`<html><body style="margin:0;background:transparent">${dibujo.replace('<svg ', `<svg width="${lado}" height="${lado}" `)}</body></html>`)
      const destino = path.join(PUB, nombre)
      await page.screenshot({ path: destino, omitBackground: transparente })
      await page.close()
      const peso = fs.statSync(destino).size
      if (peso < lado * 12) throw new Error(`${nombre} pesa ${peso} bytes: casi seguro salió vacío`)
      console.log('escrito', nombre, lado, 'px', peso, 'bytes')
    }
    // Las caras de Brote para el widget (las escribe scripts/dibuja_marca.cjs como SVG).
    for (const mood of ['feliz', 'animo', 'orgulloso', 'sueno']) {
      const fuente = path.join(PUB, 'widget', `brote-${mood}.svg`)
      if (!fs.existsSync(fuente)) continue
      const page = await browser.newPage({ viewport: { width: 300, height: 300 } })
      await page.setContent(`<html><body style="margin:0;background:transparent">${fs.readFileSync(fuente, 'utf8')}</body></html>`)
      const destino = path.join(PUB, 'widget', `brote-${mood}.png`)
      await page.screenshot({ path: destino, omitBackground: true })
      await page.close()
      fs.unlinkSync(fuente)
      const peso = fs.statSync(destino).size
      if (peso < 4000) throw new Error(`widget/brote-${mood}.png pesa ${peso} bytes: casi seguro salió vacío`)
      console.log('escrito', `widget/brote-${mood}.png`, peso, 'bytes')
    }
  } finally { await browser.close() }
})().catch(e => { console.error(e.message); process.exit(1) })
