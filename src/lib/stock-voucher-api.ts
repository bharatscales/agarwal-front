import api from "./axios"

export type StockVoucherPayload = {
  vendorId: number
  invoiceNo: string
  invoiceDate: string
  stockType?: string
}

type StockVoucherResponse = {
  id: number
  vendor_id: number | null
  vendor_code?: string | null
  vendor_name?: string | null
  vendor_type?: string | null
  invoice_no?: string | null
  invoice_date?: string | null
  stock_type?: string | null
  created_by?: number | null
  created_at?: string | null
}

const mapVoucher = (voucher: StockVoucherResponse) => ({
  id: voucher.id,
  vendorId: voucher.vendor_id ?? 0,
  vendor: voucher.vendor_code && voucher.vendor_name
    ? `${voucher.vendor_code} - ${voucher.vendor_name} (${voucher.vendor_type ?? ""})`.trim()
    : voucher.vendor_name ?? "-",
  invoiceNo: voucher.invoice_no ?? "",
  invoiceDate: voucher.invoice_date ?? "",
  stockType: voucher.stock_type ?? "",
})

export const getStockVouchers = async (skip = 0, limit = 100) => {
  const response = await api.get<StockVoucherResponse[]>(
    `/stock-voucher/?skip=${skip}&limit=${limit}`
  )
  return response.data.map(mapVoucher)
}

export const createStockVoucher = async (payload: StockVoucherPayload) => {
  const response = await api.post<StockVoucherResponse>("/stock-voucher/", {
    vendor_id: payload.vendorId,
    invoice_no: payload.invoiceNo,
    invoice_date: payload.invoiceDate,
    stock_type: payload.stockType,
  })
  return mapVoucher(response.data)
}

export const getStockVoucher = async (voucherId: number) => {
  const response = await api.get<StockVoucherResponse>(`/stock-voucher/${voucherId}`)
  return mapVoucher(response.data)
}

export const updateStockVoucher = async (voucherId: number, payload: StockVoucherPayload) => {
  const response = await api.patch<StockVoucherResponse>(`/stock-voucher/${voucherId}`, {
    vendor_id: payload.vendorId,
    invoice_no: payload.invoiceNo,
    invoice_date: payload.invoiceDate,
    stock_type: payload.stockType,
  })
  return mapVoucher(response.data)
}

export const deleteStockVoucher = async (voucherId: number) => {
  await api.delete(`/stock-voucher/${voucherId}`)
}

