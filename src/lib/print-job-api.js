import api from "./axios";
export const createPrintJob = async (payload) => {
    const response = await api.post("/print-job/", {
        printer_id: payload.printer_id || null,
        name: payload.name,
        template_id: payload.template_id || null,
        data: payload.data || null,
        copies: payload.copies || 1,
    });
    return response.data;
};
export const getPrintJob = async (jobId) => {
    const response = await api.get(`/print-job/${jobId}`);
    return response.data;
};
