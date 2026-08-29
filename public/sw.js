// Service Worker minimo: SOLO acelera la carga de assets estaticos
// (JS/CSS/imagenes de /_next/static y los iconos) y hace que la app se
// pueda "instalar" en el celular. NO cachea paginas, datos de la API, ni
// permite vender sin internet -- toda peticion de navegacion o de datos
// va siempre a la red primero, y si no hay red se muestra offline.html
// en vez de dejar caer un error crudo del navegador.

const CACHE_NAME = "pos-static-v1"
const PRECACHE_URLS = ["/manifest.json", "/icon-192.png", "/icon-512.png", "/offline.html"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Navegacion (cargar una pagina completa): red primero, offline.html si falla.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    )
    return
  }

  // Assets estaticos de Next (hasheados por build, seguros de cachear fuerte).
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon-")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return res
        })
      })
    )
    return
  }

  // Todo lo demas (API, Server Actions, datos): siempre a la red, nunca cache.
})
