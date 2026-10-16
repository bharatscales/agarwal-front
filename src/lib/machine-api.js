import api from "./axios";
const mapMachine = (machine) => ({
    id: machine.id,
    machineCode: machine.machine_code,
    machineName: machine.machine_name,
    operation: machine.operation,
    status: machine.status,
});
export const getAllMachines = async (skip = 0, limit = 100) => {
    const response = await api.get(`/machine/?skip=${skip}&limit=${limit}`);
    return response.data.map(mapMachine);
};
export const createMachine = async (payload) => {
    const response = await api.post("/machine/", {
        machine_code: payload.machineCode,
        machine_name: payload.machineName,
        operation: payload.operation,
        status: payload.status || "active",
    });
    return mapMachine(response.data);
};
export const updateMachine = async (machineId, payload) => {
    const response = await api.patch(`/machine/${machineId}`, {
        machine_code: payload.machineCode,
        machine_name: payload.machineName,
        operation: payload.operation,
        status: payload.status,
    });
    return mapMachine(response.data);
};
export const deleteMachine = async (machineId) => {
    await api.delete(`/machine/${machineId}`);
};
