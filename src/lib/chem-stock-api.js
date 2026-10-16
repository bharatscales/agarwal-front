import api from "./axios";
/** Available quantity in stock (total - issued). */
export function availableQtyChem(row) {
    return (row.qty ?? 0) - (row.issuedQty ?? 0);
}
const mapChemStock = (row) => ({
    id: row.id,
    itemId: row.item_id ?? 0,
    itemCode: row.item_code ?? "",
    itemName: row.item_name ?? "",
    color: row.color ?? "",
    qty: row.qty ?? 0,
    issuedQty: row.issued_qty ?? 0,
    barcode: row.barcode ?? "",
    uomId: row.uom_id ?? 0,
    uom: row.uom ?? "",
    gradeId: row.grade_id ?? undefined,
    grade: row.grade ?? "",
    stockVoucherId: row.stock_voucher_id ?? 0,
    invoiceNo: row.invoice_no ?? "",
    invoiceDate: row.invoice_date ?? "",
    issued: row.issued ?? false,
    issuedAt: row.issued_at ?? null,
});
export const getAllChemStock = async (skip = 0, limit = 5000, itemGroup, issued) => {
    const params = {
        skip,
        limit,
        item_group: itemGroup,
    };
    if (issued !== undefined)
        params.issued = issued;
    const response = await api.get(`/chem-stock/`, { params });
    return response.data.map(mapChemStock);
};
export const getChemStockByVoucher = async (voucherId) => {
    const response = await api.get(`/chem-stock/voucher/${voucherId}`);
    return response.data.map(mapChemStock);
};
/** Look up chem stock by barcode (for job card scan). */
export const getChemStockByBarcode = async (barcode) => {
    try {
        const response = await api.get(`/chem-stock/by-barcode/${encodeURIComponent(barcode.trim())}`);
        return mapChemStock(response.data);
    }
    catch {
        return null;
    }
};
export const createChemStock = async (payload) => {
    const response = await api.post("/chem-stock/", {
        item_id: payload.itemId,
        color: payload.color ?? null,
        qty: payload.qty ?? null,
        uom_id: payload.uomId ?? null,
        grade_id: payload.gradeId ?? null,
        stock_voucher_id: payload.stockVoucherId,
    });
    return mapChemStock(response.data);
};
export const updateChemStock = async (chemStockId, payload) => {
    const body = {};
    if (payload.itemId !== undefined)
        body.item_id = payload.itemId;
    if (payload.color !== undefined)
        body.color = payload.color;
    if (payload.qty !== undefined)
        body.qty = payload.qty;
    if (payload.uomId !== undefined)
        body.uom_id = payload.uomId;
    if (payload.gradeId !== undefined)
        body.grade_id = payload.gradeId;
    const response = await api.patch(`/chem-stock/${chemStockId}`, body);
    return mapChemStock(response.data);
};
export const deleteChemStock = async (chemStockId) => {
    await api.delete(`/chem-stock/${chemStockId}`);
};
export const bulkIssueChemStock = async (ids) => {
    const response = await api.post("/chem-stock/bulk-issue", { ids });
    return response.data;
};
export const bulkIssueChemStockWithQty = async (items) => {
    const payload = {
        items: items.map((item) => ({
            id: item.id,
            issue_qty: item.issueQty,
        })),
    };
    const response = await api.post("/chem-stock/bulk-issue-with-qty", payload);
    return response.data;
};
export const bulkRestoreChemStock = async (ids) => {
    const response = await api.post("/chem-stock/bulk-restore", { ids });
    return response.data;
};
export const exportChemStockItemWiseXlsx = async (itemGroup, issued) => {
    const params = { item_group: itemGroup };
    if (issued !== undefined)
        params.issued = issued;
    const response = await api.get("/chem-stock/export/item-wise", {
        params,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
export const exportChemStockSummaryXlsx = async (itemCode, itemGroup, issued) => {
    const params = { item_group: itemGroup };
    if (itemCode != null && itemCode.trim() !== "")
        params.item_code = itemCode.trim();
    if (issued !== undefined)
        params.issued = issued;
    const response = await api.get("/chem-stock/export/summary", {
        params,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
export function getChemGroupLabel(group) {
    return group.charAt(0).toUpperCase() + group.slice(1);
}
