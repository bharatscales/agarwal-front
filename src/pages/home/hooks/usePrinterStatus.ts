import { useEffect, useState } from "react"

import api from "@/lib/axios"

export function usePrinterStatus(enabled: boolean) {
  const [printerName, setPrinterName] = useState<string>("")
  const [printerAvailable, setPrinterAvailable] = useState<boolean>(false)
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false)

  useEffect(() => {
    if (!enabled) return

    const fetchDefaultPrinter = async () => {
      try {
        const response = await api.get<{
          available: boolean
          name: string | null
          device_id: string | null
          websocket_connected: boolean
        }>("/printer/default/zpl/status")

        if (response.data.available && response.data.name) {
          setPrinterName(response.data.name)
          setPrinterAvailable(true)
          setWebsocketConnected(response.data.websocket_connected)
        } else {
          setPrinterName("Not available")
          setPrinterAvailable(false)
          setWebsocketConnected(false)
        }
      } catch {
        setPrinterName("Not available")
        setPrinterAvailable(false)
        setWebsocketConnected(false)
      }
    }

    fetchDefaultPrinter()
    const interval = setInterval(fetchDefaultPrinter, 5000)
    return () => clearInterval(interval)
  }, [enabled])

  return { printerName, printerAvailable, websocketConnected }
}
