import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Una sola política para los dos hosts: Vercel la manda también como cabecera (vercel.json) y
// GitHub Pages solo puede con esta meta. La prueba "csp unica" exige que coincidan.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com/gsi/client",
  "connect-src 'self' https://*.supabase.co https://accounts.google.com/gsi/",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https://*.supabase.co",
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src https://accounts.google.com/gsi/",
].join('; ')

export default defineConfig({
  base: './',
  plugins: [react(), { name: 'csp', apply: 'build', transformIndexHtml: html => html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`) }],
})
