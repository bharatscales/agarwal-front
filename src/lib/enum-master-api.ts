import api from "./axios"

export type EnumMasterType = {
  key: string
  label: string
}

export type EnumMasterValue = {
  id: number
  enumKey: string
  value: string
}

type EnumValueResponse = {
  id: number
  enum_key: string
  value: string
}

const mapEnumValue = (row: EnumValueResponse): EnumMasterValue => ({
  id: row.id,
  enumKey: row.enum_key,
  value: row.value,
})

export const getEnumMasterTypes = async (): Promise<EnumMasterType[]> => {
  const response = await api.get<EnumMasterType[]>("/enum-master/types")
  return Array.isArray(response.data) ? response.data : []
}

export const getEnumMasterValues = async (enumKey: string): Promise<EnumMasterValue[]> => {
  const response = await api.get<EnumValueResponse[]>("/enum-master/values", {
    params: { enum_key: enumKey },
  })
  return Array.isArray(response.data) ? response.data.map(mapEnumValue) : []
}

export const createEnumMasterValue = async (enumKey: string, value: string): Promise<EnumMasterValue> => {
  const response = await api.post<EnumValueResponse>("/enum-master/values", {
    enum_key: enumKey,
    value,
  })
  return mapEnumValue(response.data)
}

export const updateEnumMasterValue = async (
  enumValueId: number,
  value: string
): Promise<EnumMasterValue> => {
  const response = await api.patch<EnumValueResponse>(`/enum-master/values/${enumValueId}`, {
    value,
  })
  return mapEnumValue(response.data)
}

export const deleteEnumMasterValue = async (enumValueId: number): Promise<void> => {
  await api.delete(`/enum-master/values/${enumValueId}`)
}
