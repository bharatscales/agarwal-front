import api from "./axios"

export type StockVoucherPayload = {
  vendorId: number
  invoiceNo: string
  invoiceDate: string
}

type StockVoucherResponse = {
  id: number
  vendor_id: number | null
  vendor_code?: string | null
  vendor_name?: string | null
  vendor_type?: string | null
  invoice_no?: string | null
  invoice_date?: string | null
  created_by?: number | null
  created_at?: string | null
}

const mapVoucher = (voucher: StockVoucherResponse) => ({
  id: voucher.id,
  vendor: voucher.vendor_code && voucher.vendor_name
    ? `${voucher.vendor_code} - ${voucher.vendor_name} (${voucher.vendor_type ?? ""})`.trim()
    : voucher.vendor_name ?? "-",
  invoiceNo: voucher.invoice_no ?? "",
  invoiceDate: voucher.invoice_date ?? "",
  createdAt: voucher.created_at ?? "",
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
  })
  return mapVoucher(response.data)
}

export const getStockVoucher = async (voucherId: number) => {
  const response = await api.get<StockVoucherResponse>(`/stock-voucher/${voucherId}`)
  return mapVoucher(response.data)
}

export const deleteStockVoucher = async (voucherId: number) => {
  await api.delete(`/stock-voucher/${voucherId}`)
}

