// Exporta los dibujos de código (Brote y los rangos) a archivos SVG de public/, para los
// lugares que usan <img> (festejos, pantallas de error, tarjeta para compartir, el service worker).
// Uso: node scripts/dibuja_marca.cjs
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const SRC = path.join(__dirname, '../src')
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }; cache.set(file, mod.exports)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const req = ref => {
    if (!ref.startsWith('.')) return require(ref)
    const base = path.resolve(path.dirname(file), ref)
    const hit = ['.tsx', '.ts'].map(e => base + e).find(f => fs.existsSync(f))
    if (!hit) throw new Error(`No encuentro ${ref}`)
    return load(hit)
  }
  new Function('require', 'exports', 'module', code)(req, mod.exports, mod)
  cache.set(file, mod.exports)
  return mod.exports
}

const { BroteArt } = load(path.join(SRC, 'Brote.tsx'))
const { RangoArt } = load(path.join(SRC, 'RangoArt.tsx'))
const { LogoArt } = load(path.join(SRC, 'Cana.tsx'))
const { RANKS } = load(path.join(SRC, 'lib/rangos.ts'))
const out = (rel, el) => {
  let svg = renderToStaticMarkup(el).replace(/ role="img"[^>]*?(?= [a-z]|>)/, '')
  if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  fs.writeFileSync(path.join(__dirname, '../public', rel), svg)
  console.log('escrito', rel, svg.length, 'bytes')
}
out('brote.svg', React.createElement(BroteArt, { mood: 'feliz', size: 160 }))
out('img/error.svg', React.createElement(BroteArt, { mood: 'susto', size: 160 }))
out('img/sin-senal.svg', React.createElement(BroteArt, { mood: 'sinSenal', size: 160 }))
out('img/perdido.svg', React.createElement(BroteArt, { mood: 'calma', look: 'historial', size: 160 }))
out('img/brote-coach.svg', React.createElement(BroteArt, { mood: 'orgulloso', look: 'coach', size: 160 }))
RANKS.forEach((r, i) => out(r.img, React.createElement(RangoArt, { tier: i, size: 200 })))
// v11.5: las caras del widget de Scriptable. Scriptable no lee SVG: scripts/iconos.cjs las pasa a PNG y borra el SVG.
for (const mood of ['feliz', 'animo', 'orgulloso', 'sueno']) out(`widget/brote-${mood}.svg`, React.createElement(BroteArt, { mood, size: 300 }))
// v12: el logo sale de la misma caña que Brote (src/Cana.tsx). Después corre scripts/iconos.cjs para los PNG.
fs.writeFileSync(path.join(__dirname, '../public/icon.svg'), renderToStaticMarkup(React.createElement(LogoArt, { size: 512 })).replace(/ role="img"[^>]*?(?= [a-z]|>)/, '').replace('<svg', '<svg').replace(/ width="512" height="512"(?= viewBox| xmlns)/, ''))
console.log('escrito icon.svg')
