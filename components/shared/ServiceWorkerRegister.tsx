"use client"

import { useEffect } from "react"

// Solo registra el Service Worker en producción: en desarrollo interferiría
// con el hot-reload de Next.js sirviendo assets viejos desde caché.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si falla el registro, la app sigue funcionando normal, solo sin
      // los beneficios de instalación/caché — no es un error crítico.
    })
  }, [])

  return null
}
