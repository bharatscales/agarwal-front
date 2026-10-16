import api from "./axios";
const mapParty = (party) => ({
    id: party.id,
    partyCode: party.party_code,
    partyName: party.party_name,
    partyType: party.party_type,
});
export const getAllParties = async (skip = 0, limit = 100) => {
    const response = await api.get(`/party/?skip=${skip}&limit=${limit}`);
    return response.data.map(mapParty);
};
/** Parties of type customer or both (for work order form). */
export const getPartyCustomers = async () => {
    const response = await api.get("/meta/party-customers");
    return response.data.map(mapParty);
};
export const createParty = async (payload) => {
    const response = await api.post("/party/", {
        party_code: payload.partyCode,
        party_name: payload.partyName,
        party_type: payload.partyType,
    });
    return mapParty(response.data);
};
export const updateParty = async (partyId, payload) => {
    const response = await api.patch(`/party/${partyId}`, {
        party_code: payload.partyCode,
        party_name: payload.partyName,
        party_type: payload.partyType,
    });
    return mapParty(response.data);
};
export const deleteParty = async (partyId) => {
    await api.delete(`/party/${partyId}`);
};
