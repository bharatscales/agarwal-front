import { useEffect, useState } from "react";
import api from "@/lib/axios";
export function usePrinterStatus(enabled) {
    const [printerName, setPrinterName] = useState("");
    const [printerAvailable, setPrinterAvailable] = useState(false);
    const [websocketConnected, setWebsocketConnected] = useState(false);
    useEffect(() => {
        if (!enabled)
            return;
        const fetchDefaultPrinter = async () => {
            try {
                const response = await api.get("/printer/default/zpl/status");
                if (response.data.available && response.data.name) {
                    setPrinterName(response.data.name);
                    setPrinterAvailable(true);
                    setWebsocketConnected(response.data.websocket_connected);
                }
                else {
                    setPrinterName("Not available");
                    setPrinterAvailable(false);
                    setWebsocketConnected(false);
                }
            }
            catch {
                setPrinterName("Not available");
                setPrinterAvailable(false);
                setWebsocketConnected(false);
            }
        };
        fetchDefaultPrinter();
        const interval = setInterval(fetchDefaultPrinter, 5000);
        return () => clearInterval(interval);
    }, [enabled]);
    return { printerName, printerAvailable, websocketConnected };
}
