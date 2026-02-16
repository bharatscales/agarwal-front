import api from "./axios"

export type TemplateMaster = {
  id: number
  name: string
  fileType: string
  template?: Record<string, any>[] | null
  defaultForm?: string | null
}

export type TemplatePayload = {
  name: string
  file_type: string
  template?: Record<string, any>[] | null
  default_form?: string | null
}

type TemplateResponse = {
  id: number
  name: string
  file_type: string
  template?: Record<string, any>[] | null
  default_form?: string | null
  created_by?: number
  created_at?: string
}

const mapTemplate = (template: TemplateResponse): TemplateMaster => ({
  id: template.id,
  name: template.name,
  fileType: template.file_type,
  template: template.template,
  defaultForm: template.default_form,
})

export const getAllTemplates = async (skip = 0, limit = 100) => {
  const response = await api.get<TemplateResponse[]>(`/template/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapTemplate)
}

export const createTemplate = async (payload: TemplatePayload) => {
  const response = await api.post<TemplateResponse>("/template/", {
    name: payload.name,
    file_type: payload.file_type,
    template: payload.template,
    default_form: payload.default_form,
  })
  return mapTemplate(response.data)
}

export const updateTemplate = async (templateId: number, payload: Partial<TemplatePayload>) => {
  const response = await api.patch<TemplateResponse>(`/template/${templateId}`, {
    name: payload.name,
    file_type: payload.file_type,
    template: payload.template,
    default_form: payload.default_form,
  })
  return mapTemplate(response.data)
}

export const deleteTemplate = async (templateId: number) => {
  await api.delete(`/template/${templateId}`)
}

