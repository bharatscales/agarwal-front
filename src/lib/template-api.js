import api from "./axios";
const mapTemplate = (template) => ({
    id: template.id,
    name: template.name,
    fileType: template.file_type,
    template: template.template,
    defaultForm: template.default_form,
});
export const getAllTemplates = async (skip = 0, limit = 100) => {
    const response = await api.get(`/template/?skip=${skip}&limit=${limit}`);
    return response.data.map(mapTemplate);
};
export const createTemplate = async (payload) => {
    const response = await api.post("/template/", {
        name: payload.name,
        file_type: payload.file_type,
        template: payload.template,
        default_form: payload.default_form,
    });
    return mapTemplate(response.data);
};
export const updateTemplate = async (templateId, payload) => {
    const response = await api.patch(`/template/${templateId}`, {
        name: payload.name,
        file_type: payload.file_type,
        template: payload.template,
        default_form: payload.default_form,
    });
    return mapTemplate(response.data);
};
export const deleteTemplate = async (templateId) => {
    await api.delete(`/template/${templateId}`);
};
