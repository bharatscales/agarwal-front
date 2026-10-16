import api from "./axios";
const mapWorkOrder = (wo) => ({
    id: wo.id,
    woNumber: wo.wo_number,
    partyId: wo.party_id,
    partyCode: wo.party_code,
    partyName: wo.party_name,
    itemId: wo.item_id,
    itemCode: wo.item_code,
    itemName: wo.item_name,
    plannedQty: wo.planned_qty,
    producedQty: wo.produced_qty,
    status: wo.status,
    priority: wo.priority,
    createdBy: wo.created_by,
    createdAt: wo.created_at,
    startedAt: wo.started_at,
    completedAt: wo.completed_at,
    skippedOperations: wo.skipped_operations ?? [],
    itemRouting: Array.isArray(wo.item_routing) ? wo.item_routing : [],
});
export const getAllWorkOrders = async (skip = 0, limit = 100, status) => {
    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    if (status) {
        params.append("status", status);
    }
    const response = await api.get(`/work-order/?${params.toString()}`);
    return response.data.map(mapWorkOrder);
};
export const createWorkOrder = async (payload) => {
    const requestPayload = {
        wo_number: payload.woNumber || null,
        party_id: payload.partyId,
        item_id: payload.itemId,
        priority: payload.priority || "normal",
        status: payload.status || "planned",
        machine_id: payload.machineId,
        operator_name: payload.operatorName,
        shift: payload.shift,
    };
    // Only include planned_qty if provided
    if (payload.plannedQty !== undefined) {
        requestPayload.planned_qty = payload.plannedQty;
    }
    const response = await api.post("/work-order/", requestPayload);
    return mapWorkOrder(response.data);
};
export const updateWorkOrder = async (workOrderId, payload) => {
    const updatePayload = {};
    if (payload.woNumber !== undefined)
        updatePayload.wo_number = payload.woNumber || null;
    if (payload.partyId !== undefined)
        updatePayload.party_id = payload.partyId;
    if (payload.itemId !== undefined)
        updatePayload.item_id = payload.itemId;
    if (payload.plannedQty !== undefined)
        updatePayload.planned_qty = payload.plannedQty;
    if (payload.priority !== undefined)
        updatePayload.priority = payload.priority;
    if (payload.status !== undefined)
        updatePayload.status = payload.status;
    const response = await api.patch(`/work-order/${workOrderId}`, updatePayload);
    return mapWorkOrder(response.data);
};
export const deleteWorkOrder = async (workOrderId) => {
    await api.delete(`/work-order/${workOrderId}`);
};
export const isTrackFullyComplete = (track) => {
    if (!track || track.stages.length === 0)
        return false;
    const required = track.stages.filter((stage) => stage.state !== "skipped");
    if (required.length === 0)
        return false;
    return required.every((stage) => stage.state === "completed");
};
export const getFloorAvailability = async (operation) => {
    const response = await api.get("/work-order/floor-availability", {
        params: { operation },
    });
    return {
        available: (response.data.available ?? []).map((row) => ({
            workOrderId: row.work_order_id,
            stages: row.stages ?? [],
        })),
        loadedWorkOrderIds: response.data.loaded_work_order_ids ?? [],
    };
};
export const getWorkOrderTracks = async (ids) => {
    if (ids.length === 0)
        return {};
    const response = await api.get("/work-order/track", {
        params: { ids: ids.join(",") },
    });
    const tracks = {};
    for (const row of response.data) {
        tracks[row.work_order_id] = {
            workOrderId: row.work_order_id,
            stages: row.stages ?? [],
        };
    }
    return tracks;
};
export const skipWorkOrderOperation = async (workOrderId, operation) => {
    const response = await api.post(`/work-order/${workOrderId}/skip-operation`, {
        operation,
    });
    return mapWorkOrder(response.data);
};
