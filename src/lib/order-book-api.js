import api from "./axios";
export const ORDER_BOOK_STATUSES = ["pending", "closed"];
const mapOrderBook = (row) => ({
    id: row.id,
    orderNumber: row.order_number,
    partyId: row.party_id,
    partyCode: row.party_code,
    partyName: row.party_name,
    itemId: row.item_id,
    itemCode: row.item_code,
    itemName: row.item_name,
    qty: row.qty,
    orderDate: row.order_date,
    poNo: row.po_no ?? null,
    totalGsm: row.total_gsm ?? null,
    size: row.size ?? null,
    structure: row.structure ?? null,
    coilWidth: row.coil_width ?? null,
    repeatLength: row.repeat_length ?? null,
    noOfPanel: row.no_of_panel ?? null,
    status: row.status || "pending",
    dispatchQty: row.dispatch_qty ?? 0,
    remarks: row.remarks,
    createdBy: row.created_by,
    createdAt: row.created_at,
});
export const getAllOrderBooks = async (skip = 0, limit = 500) => {
    const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
    });
    const response = await api.get(`/order-book/?${params.toString()}`);
    return response.data.map(mapOrderBook);
};
export const getOrderBook = async (orderBookId) => {
    const response = await api.get(`/order-book/${orderBookId}`);
    return mapOrderBook(response.data);
};
export const createOrderBook = async (payload) => {
    const requestPayload = {
        party_id: payload.partyId,
        item_id: payload.itemId,
        qty: payload.qty,
    };
    if (payload.orderDate)
        requestPayload.order_date = payload.orderDate;
    if (payload.poNo !== undefined)
        requestPayload.po_no = payload.poNo || null;
    if (payload.totalGsm !== undefined)
        requestPayload.total_gsm = payload.totalGsm;
    if (payload.size !== undefined)
        requestPayload.size = payload.size;
    if (payload.structure !== undefined)
        requestPayload.structure = payload.structure || null;
    if (payload.coilWidth !== undefined)
        requestPayload.coil_width = payload.coilWidth;
    if (payload.repeatLength !== undefined)
        requestPayload.repeat_length = payload.repeatLength;
    if (payload.noOfPanel !== undefined)
        requestPayload.no_of_panel = payload.noOfPanel;
    if (payload.status !== undefined)
        requestPayload.status = payload.status;
    if (payload.remarks !== undefined)
        requestPayload.remarks = payload.remarks || null;
    const response = await api.post("/order-book/", requestPayload);
    return mapOrderBook(response.data);
};
export const updateOrderBook = async (orderBookId, payload) => {
    const updatePayload = {};
    if (payload.partyId !== undefined)
        updatePayload.party_id = payload.partyId;
    if (payload.itemId !== undefined)
        updatePayload.item_id = payload.itemId;
    if (payload.qty !== undefined)
        updatePayload.qty = payload.qty;
    if (payload.orderDate !== undefined)
        updatePayload.order_date = payload.orderDate || null;
    if (payload.poNo !== undefined)
        updatePayload.po_no = payload.poNo || null;
    if (payload.totalGsm !== undefined)
        updatePayload.total_gsm = payload.totalGsm;
    if (payload.size !== undefined)
        updatePayload.size = payload.size;
    if (payload.structure !== undefined)
        updatePayload.structure = payload.structure || null;
    if (payload.coilWidth !== undefined)
        updatePayload.coil_width = payload.coilWidth;
    if (payload.repeatLength !== undefined)
        updatePayload.repeat_length = payload.repeatLength;
    if (payload.noOfPanel !== undefined)
        updatePayload.no_of_panel = payload.noOfPanel;
    if (payload.status !== undefined)
        updatePayload.status = payload.status;
    if (payload.remarks !== undefined)
        updatePayload.remarks = payload.remarks || null;
    const response = await api.patch(`/order-book/${orderBookId}`, updatePayload);
    return mapOrderBook(response.data);
};
export const deleteOrderBook = async (orderBookId) => {
    await api.delete(`/order-book/${orderBookId}`);
};
const mapOrderDispatch = (row) => ({
    id: row.id,
    orderBookId: row.order_book_id,
    dispatchDate: row.dispatch_date,
    qty: row.qty,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
});
export const getOrderDispatches = async (orderBookId) => {
    const response = await api.get(`/order-book/${orderBookId}/dispatches`);
    return response.data.map(mapOrderDispatch);
};
export const createOrderDispatch = async (orderBookId, payload) => {
    const response = await api.post(`/order-book/${orderBookId}/dispatches`, {
        dispatch_date: payload.dispatchDate,
        qty: payload.qty,
    });
    return mapOrderBook(response.data);
};
