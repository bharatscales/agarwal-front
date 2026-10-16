import api from "./axios";
const mapEnumValue = (row) => ({
    id: row.id,
    enumKey: row.enum_key,
    value: row.value,
});
export const getEnumMasterTypes = async () => {
    const response = await api.get("/enum-master/types");
    return Array.isArray(response.data) ? response.data : [];
};
export const getEnumMasterValues = async (enumKey) => {
    const response = await api.get("/enum-master/values", {
        params: { enum_key: enumKey },
    });
    return Array.isArray(response.data) ? response.data.map(mapEnumValue) : [];
};
export const createEnumMasterValue = async (enumKey, value) => {
    const response = await api.post("/enum-master/values", {
        enum_key: enumKey,
        value,
    });
    return mapEnumValue(response.data);
};
export const updateEnumMasterValue = async (enumValueId, value) => {
    const response = await api.patch(`/enum-master/values/${enumValueId}`, {
        value,
    });
    return mapEnumValue(response.data);
};
export const deleteEnumMasterValue = async (enumValueId) => {
    await api.delete(`/enum-master/values/${enumValueId}`);
};
