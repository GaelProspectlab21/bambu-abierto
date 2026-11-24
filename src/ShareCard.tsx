import type { WeekReport } from './lib/weekly'

/**
 * Tu semana como imagen (1080x1350, formato de historia y de WhatsApp). Se dibuja en el teléfono:
 * no sale nada a internet hasta que tú eliges con quién compartirla. Colores de docs/BRAND.md.
 */
/** La paleta base de tokens.css no cambia con el tema: la imagen siempre sale en claro. */
function palette() {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
  return { canvas: v('--tinta-50', 'white'), surface: 'white', ink: v('--tinta-900', 'black'), body: v('--tinta-600', 'gray'), accent: v('--bambu-700', 'green'), sun: v('--sol-400', 'gold'), sunInk: v('--tinta-900', 'black') }
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, line: number): number {
  let row = ''
  for (const word of text.split(' ')) {
    const next = row ? `${row} ${word}` : word
    if (ctx.measureText(next).width > max && row) { ctx.fillText(row, x, y); y += line; row = word } else row = next
  }
  if (row) ctx.fillText(row, x, y)
  return y + line
}
function image(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src })
}

export async function weekCard(r: WeekReport, name: string, cells: { label: string; value: number }[]): Promise<Blob> {
  await document.fonts?.ready
  const C = palette()
  const W = 1080, H = 1350
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')!
  const display = "'Fraunces Variable', Georgia, serif", text = "'Avenir Next', 'Segoe UI', system-ui, sans-serif"
  ctx.fillStyle = C.canvas; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = C.accent; ctx.font = `650 64px ${display}`; ctx.fillText('bambú', 80, 130)
  ctx.fillStyle = C.ink; ctx.font = `620 82px ${display}`
  let y = wrap(ctx, name ? `La semana de ${name}` : 'Mi semana', 80, 270, 700, 92)
  try { const b = await image('/brote.svg'); ctx.drawImage(b, W - 300, 150, 230, 230) } catch { /* sin Brote la tarjeta sirve igual */ }
  y = Math.max(y + 20, 420)
  const cw = (W - 160 - 30) / 2, ch = 210
  cells.slice(0, 4).forEach((c, i) => {
    const x = 80 + (i % 2) * (cw + 30), top = y + Math.floor(i / 2) * (ch + 30)
    round(ctx, x, top, cw, ch, 36); ctx.fillStyle = C.surface; ctx.fill()
    ctx.fillStyle = C.ink; ctx.font = `650 92px ${display}`; ctx.fillText(String(c.value), x + 40, top + 115)
    ctx.fillStyle = C.body; ctx.font = `500 34px ${text}`; ctx.fillText(c.label, x + 40, top + 170)
  })
  y += 2 * (ch + 30) + 30
  if (r.now.promised > 0) {
    round(ctx, 80, y, W - 160, 120, 60); ctx.fillStyle = C.sun; ctx.fill()
    ctx.fillStyle = C.sunInk; ctx.font = `700 44px ${text}`; ctx.fillText(`${r.now.kept} de ${r.now.promised} promesas cumplidas`, 130, y + 76)
    y += 170
  }
  ctx.fillStyle = C.ink; ctx.font = `500 40px ${text}`
  for (const w of r.wins.slice(0, 2)) y = wrap(ctx, w, 80, y + 20, W - 160, 52) + 6
  ctx.fillStyle = C.accent; ctx.font = `600 38px ${display}`; ctx.fillText('Mide cuánto das, no cuánto produces.', 80, H - 90)
  return new Promise((ok, fail) => cv.toBlob(b => b ? ok(b) : fail(new Error('No se pudo dibujar la imagen')), 'image/png'))
}

/** Comparte la imagen con el menú del teléfono; si no se puede, la descarga. */
export async function shareBlob(blob: Blob, filename: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared' } catch { return 'cancelled' }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  return 'downloaded'
}
