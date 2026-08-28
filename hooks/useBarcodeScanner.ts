import { useEffect, useRef } from "react"

const BARCODE_TIMEOUT = 50 // ms between keystrokes to consider it a barcode scan
const BARCODE_MIN_LENGTH = 4 // minimum barcode length

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const scannerTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const barcodeRef = useRef<string>("")
  const lastKeystrokeRef = useRef<number>(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with Ctrl/Cmd + key combinations
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const currentTime = Date.now()
      const timeSinceLastKeystroke = currentTime - lastKeystrokeRef.current
      lastKeystrokeRef.current = currentTime

      // If too much time has passed, reset barcode
      if (timeSinceLastKeystroke > BARCODE_TIMEOUT * 3) {
        barcodeRef.current = ""
      }

      // Collect printable characters
      if (e.key.length === 1) {
        barcodeRef.current += e.key
      }

      // Handle Enter key as scan complete
      if (e.key === "Enter" && barcodeRef.current.length >= BARCODE_MIN_LENGTH) {
        e.preventDefault()
        const barcode = barcodeRef.current.trim()
        barcodeRef.current = ""
        onScan(barcode)
        return
      }

      // Clear timeout and set new one
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current)
      }

      scannerTimeoutRef.current = setTimeout(() => {
        // Reset if no Enter key pressed within timeout
        if (barcodeRef.current.length < BARCODE_MIN_LENGTH) {
          barcodeRef.current = ""
        }
      }, BARCODE_TIMEOUT * 5)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current)
      }
    }
  }, [onScan])
}
