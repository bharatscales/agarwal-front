import { useEffect, useState } from "react"
import { X } from "lucide-react"

import type { OrderBookMaster } from "@/components/columns/order-book-columns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createOrderDispatch,
  getOrderDispatches,
  type OrderDispatch,
} from "@/lib/order-book-api"

const todayIso = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  return value.slice(0, 10)
}

type Props = {
  open: boolean
  order: OrderBookMaster | null
  onOpenChange: (open: boolean) => void
  onDispatched: (order: OrderBookMaster) => void
}

export function OrderBookDispatchDialog({ open, order, onOpenChange, onDispatched }: Props) {
  const [dispatchDate, setDispatchDate] = useState(todayIso())
  const [qty, setQty] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [history, setHistory] = useState<OrderDispatch[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const remaining = Math.max(0, Number(order?.qty || 0) - Number(order?.dispatchQty || 0))

  useEffect(() => {
    if (!open || !order) return
    setDispatchDate(todayIso())
    setQty("")
    setError(null)
    setIsLoadingHistory(true)
    getOrderDispatches(order.id)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setIsLoadingHistory(false))
  }, [open, order])

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    const dispatchQty = Number(qty)
    if (!Number.isFinite(dispatchQty) || dispatchQty <= 0) {
      setError("Dispatch quantity must be a positive number")
      return
    }

    setIsSubmitting(true)
    createOrderDispatch(order.id, {
      dispatchDate: dispatchDate || todayIso(),
      qty: dispatchQty,
    })
      .then((updated) => {
        onDispatched(updated)
        onOpenChange(false)
      })
      .catch((err) => {
        const detail = err.response?.data?.detail
        setError(typeof detail === "string" ? detail : "Failed to save dispatch. Please try again.")
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  if (!open || !order) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Dispatch order</CardTitle>
            <CardDescription>
              {order.orderNumber || `Order #${order.id}`} — remaining {remaining.toFixed(2)} KG
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Order qty</p>
                <p className="font-medium">{Number(order.qty).toFixed(2)} KG</p>
              </div>
              <div>
                <p className="text-muted-foreground">Already dispatched</p>
                <p className="font-medium">{Number(order.dispatchQty || 0).toFixed(2)} KG</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dispatchDate">Dispatch date *</Label>
                <Input
                  id="dispatchDate"
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatchQty">Dispatch quantity *</Label>
                <Input
                  id="dispatchQty"
                  type="number"
                  step="0.01"
                  min="0"
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value)
                    if (error) setError(null)
                  }}
                  placeholder="Enter quantity"
                  className={error ? "border-red-500" : ""}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="space-y-2">
              <p className="text-sm font-medium">Previous dispatches</p>
              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No dispatches recorded yet.</p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40 text-left">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium text-right">Qty (KG)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row) => (
                        <tr key={row.id} className="border-b last:border-0">
                          <td className="px-3 py-2">{formatDate(row.dispatchDate)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{Number(row.qty).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 mt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save dispatch"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
