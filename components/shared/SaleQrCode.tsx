"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"

export function SaleQrCode({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <div className="flex flex-col items-center gap-1">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Código QR de la factura" width={size} height={size} />
      ) : (
        <div style={{ width: size, height: size }} className="bg-gray-100 animate-pulse rounded" />
      )}
      <p className="text-[10px] text-gray-500">Escanea para ver tu factura</p>
    </div>
  )
}
