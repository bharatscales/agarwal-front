import { useState } from "react"

export function useScaleConnection() {
  const [scaleWeight, setScaleWeight] = useState<number | null>(null)
  const [scaleWeightError, setScaleWeightError] = useState<string | null>(null)
  const [isSerialSupported] = useState(
    () => typeof navigator !== "undefined" && "serial" in navigator
  )
  const [isScaleConnecting, setIsScaleConnecting] = useState(false)
  const [isScaleConnected, setIsScaleConnected] = useState(false)

  const connectScale = async () => {
    if (!isSerialSupported) {
      setScaleWeight(null)
      setScaleWeightError("Not supported")
      return
    }
    try {
      setIsScaleConnecting(true)
      setScaleWeightError(null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 9600 })

      setIsScaleConnecting(false)
      setIsScaleConnected(true)

      const textDecoder = new TextDecoderStream()
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
      const reader = textDecoder.readable.getReader()

      ;(async () => {
        try {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue

            const text = String(value).trim()
            const match = text.match(/-?\d+(\.\d+)?/)
            if (match) {
              const parsed = parseFloat(match[0])
              if (!Number.isNaN(parsed)) {
                setScaleWeight(parsed)
              }
            }
          }
        } catch (err) {
          setScaleWeight(null)
          if (!(err instanceof Error && err.name === "AbortError")) {
            setScaleWeightError("Read error")
          }
        } finally {
          setIsScaleConnected(false)
          try {
            reader.releaseLock()
            await readableStreamClosed
            await port.close()
          } catch {
            // ignore close errors
          }
        }
      })()
    } catch (err) {
      setIsScaleConnecting(false)
      setIsScaleConnected(false)
      setScaleWeight(null)
      setScaleWeightError(err instanceof Error ? err.message : "Connection failed")
    }
  }

  return {
    scaleWeight,
    scaleWeightError,
    isSerialSupported,
    isScaleConnecting,
    isScaleConnected,
    connectScale,
  }
}
