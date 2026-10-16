import api from "./axios";
/** Available quantity in stock (total - issued). */
export function availableQty(row) {
    return (row.qty ?? 0) - (row.issuedQty ?? 0);
}
const mapInkStock = (row) => ({
    id: row.id,
    itemId: row.item_id ?? 0,
    itemCode: row.item_code ?? "",
    itemName: row.item_name ?? "",
    color: row.color ?? "",
    qty: row.qty ?? 0,
    issuedQty: row.issued_qty ?? 0,
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
export const getAllInkStock = async (skip = 0, limit = 5000, issued) => {
    const params = {
        skip,
        limit,
        item_group: "ink",
    };
    if (issued !== undefined)
        params.issued = issued;
    const response = await api.get(`/chem-stock/`, { params });
    return response.data.map(mapInkStock);
};
export const bulkIssueInkStock = async (ids) => {
    const response = await api.post("/chem-stock/bulk-issue", { ids });
    return response.data;
};
export const bulkIssueInkStockWithQty = async (items) => {
    const payload = {
        items: items.map((item) => ({
            id: item.id,
            issue_qty: item.issueQty,
        })),
    };
    const response = await api.post("/chem-stock/bulk-issue-with-qty", payload);
    return response.data;
};
export const bulkRestoreInkStock = async (ids) => {
    const response = await api.post("/chem-stock/bulk-restore", { ids });
    return response.data;
};
export const exportInkStockItemWiseXlsx = async (issued) => {
    const params = { item_group: "ink" };
    if (issued !== undefined)
        params.issued = issued;
    const response = await api.get("/chem-stock/export/item-wise", {
        params,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
export const exportInkStockSummaryXlsx = async (itemCode, issued) => {
    const params = { item_group: "ink" };
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
