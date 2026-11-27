const CACHE = 'bambu-shell-v11-1'
// Recordatorios: el servidor manda {title, body, url, tag}. iOS exige mostrar SIEMPRE una
// notificación por cada push; si no, revoca el permiso.
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(data.title || 'Bambú', {
    body: data.body || '', tag: data.tag || 'bambu', icon: '/icon.svg', badge: '/icon.svg', data: { url: data.url || '/' },
  }))
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin)
    if (open) { await open.focus(); return open.navigate(url) }
    return self.clients.openWindow(url)
  })())
})
// Las imágenes de error y sin señal se precargan: justo se ven cuando no hay red.
// Los dibujos técnicos pesan casi nada: se precargan para que la técnica se vea sin señal desde el primer día.
const DRAWN = ['pike', 'pike-elevated', 'pike-parallettes', 'curl-towel', 'hollow', 'tuck-lsit', 'copenhagen', 'nordic', 'floor-towel-pull'].flatMap((id) => [`/ejercicios/${id}-0.svg`, `/ejercicios/${id}-1.svg`])
const CORE = ['/', '/manifest.webmanifest', '/icon.svg', '/brote.svg', '/img/error.svg', '/img/sin-senal.svg', '/img/perdido.svg', ...DRAWN]
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(CORE)
    const shell = await cache.match('/')
    const html = await shell.text()
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^" ]+)"/g)].map((match) => match[1])
    await cache.addAll([...new Set(assets)])
    await self.skipWaiting()
  })())
})
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('bambu-') && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const copy = response.clone()
          const cache = await caches.open(CACHE)
          await cache.put('/', copy)
        }
        return response
      } catch {
        return (await caches.match(request)) ?? (await caches.match('/')) ?? Response.error()
      }
    })())
    return
  }
  event.respondWith((async () => {
    const cached = await caches.match(request)
    if (cached) return cached
    const response = await fetch(request)
    if (response.ok) {
      const copy = response.clone()
      const cache = await caches.open(CACHE)
      await cache.put(request, copy)
    }
    return response
  })())
})
