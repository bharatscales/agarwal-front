import api from "./axios"

export type PartyPayload = {
  partyCode: string
  partyName: string
  partyType: string
}

type PartyResponse = {
  id: number
  party_code: string
  party_name: string
  party_type: string
  created_by?: number
  created_at?: string
}

const mapParty = (party: PartyResponse) => ({
  id: party.id,
  partyCode: party.party_code,
  partyName: party.party_name,
  partyType: party.party_type,
})

export const getAllParties = async (skip = 0, limit = 100) => {
  const response = await api.get<PartyResponse[]>(`/party/?skip=${skip}&limit=${limit}`)
  return response.data.map(mapParty)
}

export const createParty = async (payload: PartyPayload) => {
  const response = await api.post<PartyResponse>("/party/", {
    party_code: payload.partyCode,
    party_name: payload.partyName,
    party_type: payload.partyType,
  })
  return mapParty(response.data)
}

export const updateParty = async (partyId: number, payload: Partial<PartyPayload>) => {
  const response = await api.patch<PartyResponse>(`/party/${partyId}`, {
    party_code: payload.partyCode,
    party_name: payload.partyName,
    party_type: payload.partyType,
  })
  return mapParty(response.data)
}

export const deleteParty = async (partyId: number) => {
  await api.delete(`/party/${partyId}`)
}

