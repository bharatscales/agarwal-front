import api from "./axios"

export type PrintJobPayload = {
  printer_id?: string | null
  name: string
  template_id?: number | null
  data?: Record<string, any> | null
  copies?: number
}

type PrintJobResponse = {
  id: string
  printer_id?: string | null
  name: string
  template_id?: number | null
  data?: Record<string, any> | null
  status: string
  copies: number
  created_at?: string
}

export const createPrintJob = async (payload: PrintJobPayload) => {
  const response = await api.post<PrintJobResponse>("/print-job/", {
    printer_id: payload.printer_id || null,
    name: payload.name,
    template_id: payload.template_id || null,
    data: payload.data || null,
    copies: payload.copies || 1,
  })
  return response.data
}

export const getPrintJob = async (jobId: string) => {
  const response = await api.get<PrintJobResponse>(`/print-job/${jobId}`)
  return response.data
}

