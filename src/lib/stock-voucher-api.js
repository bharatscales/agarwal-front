import api from "./axios";
const mapVoucher = (voucher) => ({
    id: voucher.id,
    vendorId: voucher.vendor_id ?? 0,
    vendorCode: voucher.vendor_code ?? "",
    vendorName: voucher.vendor_name ?? "",
    vendorType: voucher.vendor_type ?? "",
    vendor: voucher.vendor_code && voucher.vendor_name
        ? `${voucher.vendor_code} - ${voucher.vendor_name} (${voucher.vendor_type ?? ""})`.trim()
        : voucher.vendor_name ?? "-",
    invoiceNo: voucher.invoice_no ?? "",
    invoiceDate: voucher.invoice_date ?? "",
    stockType: voucher.stock_type ?? "",
});
export const getPartyStockSummaries = async () => {
    const response = await api.get("/stock-voucher/party-summary");
    return response.data;
};
export const getStockVouchers = async (skip = 0, limit = 100, vendorId) => {
    let url = `/stock-voucher/?skip=${skip}&limit=${limit}`;
    if (vendorId != null) {
        url += `&vendor_id=${vendorId}`;
    }
    const response = await api.get(url);
    return response.data.map(mapVoucher);
};
export const createStockVoucher = async (payload) => {
    const response = await api.post("/stock-voucher/", {
        vendor_id: payload.vendorId,
        invoice_no: payload.invoiceNo,
        invoice_date: payload.invoiceDate,
        stock_type: payload.stockType,
    });
    return mapVoucher(response.data);
};
export const getStockVoucher = async (voucherId) => {
    const response = await api.get(`/stock-voucher/${voucherId}`);
    return mapVoucher(response.data);
};
export const updateStockVoucher = async (voucherId, payload) => {
    const response = await api.patch(`/stock-voucher/${voucherId}`, {
        vendor_id: payload.vendorId,
        invoice_no: payload.invoiceNo,
        invoice_date: payload.invoiceDate,
        stock_type: payload.stockType,
    });
    return mapVoucher(response.data);
};
export const deleteStockVoucher = async (voucherId) => {
    await api.delete(`/stock-voucher/${voucherId}`);
};
