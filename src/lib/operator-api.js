import api from "./axios";
const mapOperator = (operator) => ({
    id: operator?.id ?? 0,
    operatorName: operator?.operator_name ?? "",
    machineId: operator?.machine_id ?? null,
    machineCode: operator?.machine_code ?? null,
    machineName: operator?.machine_name ?? null,
    operation: operator?.operation ?? null,
});
export const getAllOperators = async (skip = 0, limit = 100) => {
    const response = await api.get(`/operator/?skip=${skip}&limit=${limit}`);
    return response.data.map(mapOperator);
};
export const createOperator = async (payload) => {
    const response = await api.post("/operator/", {
        operator_name: payload.operatorName,
        machine_id: payload.machineId || null,
    });
    const data = response?.data;
    if (!data || typeof data !== "object") {
        throw new Error("Invalid response when creating operator");
    }
    return mapOperator(data);
};
export const updateOperator = async (operatorId, payload) => {
    const response = await api.patch(`/operator/${operatorId}`, {
        operator_name: payload.operatorName,
        machine_id: payload.machineId !== undefined ? payload.machineId : null,
    });
    return mapOperator(response.data);
};
export const deleteOperator = async (operatorId) => {
    await api.delete(`/operator/${operatorId}`);
};
