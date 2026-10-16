import api from "./axios";
const mapRollsStock = (rollsStock) => ({
    id: rollsStock.id,
    itemId: rollsStock.item_id ?? 0,
    itemCode: rollsStock.item_code ?? "",
    itemName: rollsStock.item_name ?? "",
    vendorCode: rollsStock.vendor_code ?? "",
    gradeId: rollsStock.grade_id ?? undefined,
    grade: rollsStock.grade ?? "",
    barcode: rollsStock.barcode ?? "",
    rollno: rollsStock.rollno ?? "",
    size: rollsStock.size ?? 0,
    micron: rollsStock.micron ?? 0,
    netweight: rollsStock.netweight ?? 0,
    meter: rollsStock.meter != null ? Math.round(rollsStock.meter) : 0,
    grossweight: rollsStock.grossweight ?? 0,
    wastage: rollsStock.wastage ?? 0,
    wastageReason: rollsStock.wastage_reason ?? null,
    noOfTag: rollsStock.no_of_tag ?? null,
    noOfCuts: rollsStock.no_of_cuts ?? null,
    operatorName: rollsStock.operator_name ?? null,
    shift: rollsStock.shift ?? null,
    remark: rollsStock.remark ?? null,
    plainWastage: rollsStock.plain_wastage ?? null,
    printedWastage: rollsStock.printed_wastage ?? null,
    inkGsm: rollsStock.ink_gsm ?? null,
    inkGsmByInkWt: rollsStock.ink_gsm_by_ink_wt ?? null,
    adhesiveOh: rollsStock.adhesive_oh ?? null,
    adhesiveNco: rollsStock.adhesive_nco ?? null,
    ohPercent: rollsStock.oh_percent ?? null,
    trimWastage: rollsStock.trim_wastage ?? null,
    lumpsWastage: rollsStock.lumps_wastage ?? null,
    eclOutputWastage: rollsStock.ecl_output_wastage ?? null,
    eclWastage: rollsStock.ecl_wastage ?? null,
    laminationWastage: rollsStock.lamination_wastage ?? null,
    slitterWastage: rollsStock.slitter_wastage ?? null,
    coilRewinding: rollsStock.coil_rewinding ?? null,
    slitDirection: rollsStock.slit_direction ?? null,
    coreSize: rollsStock.core_size ?? null,
    coilDia: rollsStock.coil_dia ?? null,
    jobRepeat: rollsStock.job_repeat ?? null,
    balanceWeight: rollsStock.balance_weight ?? null,
    parentNetweight: rollsStock.parent_netweight ?? null,
    parentMeter: rollsStock.parent_meter != null ? Math.round(rollsStock.parent_meter) : null,
    parentBalanceWeight: rollsStock.parent_balance_weight ?? null,
    itemDensity: rollsStock.item_density ?? null,
    stockVoucherId: rollsStock.stock_voucher_id ?? 0,
    invoiceNo: rollsStock.invoice_no ?? "",
    invoiceDate: rollsStock.invoice_date ?? "",
    issued: rollsStock.issued ?? false,
    issuedAt: rollsStock.issued_at ?? null,
    stage: rollsStock.stage ?? null,
    parentRollId: rollsStock.parent_roll_id ?? null,
    parentRollIds: rollsStock.parent_roll_ids ?? null,
    consumed: rollsStock.consumed ?? false,
    consumedAt: rollsStock.consumed_at ?? null,
    jobCardNumber: rollsStock.job_card_number ?? null,
    parentRolls: (rollsStock.parent_rolls ?? []).map((parent) => ({
        id: parent.id,
        itemName: parent.item_name ?? "",
        size: parent.size ?? null,
        micron: parent.micron ?? null,
        netweight: parent.netweight ?? null,
        meter: parent.meter != null ? Math.round(parent.meter) : null,
        wastage: parent.wastage ?? null,
        balanceWeight: parent.balance_weight ?? null,
        stage: parent.stage ?? null,
    })),
});
export const getRollsStockByVoucher = async (voucherId) => {
    const response = await api.get(`/rolls-stock/voucher/${voucherId}`);
    return response.data.map(mapRollsStock);
};
export const getAllRollsStock = async (skip = 0, limit = 1000, issued, stage) => {
    const params = {
        skip,
        limit,
    };
    if (issued !== undefined)
        params.issued = issued;
    if (stage != null && stage !== "")
        params.stage = stage;
    const response = await api.get(`/rolls-stock/`, {
        params,
    });
    return response.data.map(mapRollsStock);
};
/** Walk every page so a picker is not cut off at the first request. */
export const getEveryRollsStock = async (issued, stage) => {
    const pageSize = 1000;
    const all = [];
    let skip = 0;
    for (;;) {
        const page = await getAllRollsStock(skip, pageSize, issued, stage);
        all.push(...page);
        if (page.length < pageSize)
            break;
        skip += page.length;
    }
    return all;
};
export const createRollsStock = async (payload) => {
    const body = {
        item_id: payload.itemId,
        rollno: payload.rollno,
        size: payload.size,
        micron: payload.micron,
        netweight: payload.netweight,
        meter: payload.meter,
        grossweight: payload.grossweight,
        wastage: payload.wastage,
        wastage_reason: payload.wastageReason,
        no_of_tag: payload.noOfTag,
        no_of_cuts: payload.noOfCuts,
        operator_name: payload.operatorName,
        shift: payload.shift,
        remark: payload.remark,
        plain_wastage: payload.plainWastage,
        printed_wastage: payload.printedWastage,
        ink_gsm: payload.inkGsm,
        ink_gsm_by_ink_wt: payload.inkGsmByInkWt,
        adhesive_oh: payload.adhesiveOh,
        adhesive_nco: payload.adhesiveNco,
        oh_percent: payload.ohPercent,
        trim_wastage: payload.trimWastage,
        lumps_wastage: payload.lumpsWastage,
        ecl_output_wastage: payload.eclOutputWastage,
        ecl_wastage: payload.eclWastage,
        lamination_wastage: payload.laminationWastage,
        slitter_wastage: payload.slitterWastage,
        coil_rewinding: payload.coilRewinding,
        slit_direction: payload.slitDirection,
        core_size: payload.coreSize,
        coil_dia: payload.coilDia,
        job_repeat: payload.jobRepeat,
        grade_id: payload.gradeId,
        stock_voucher_id: payload.stockVoucherId,
        stage: payload.stage,
    };
    if (payload.parentRollIds != null && payload.parentRollIds.length > 0) {
        body.parent_roll_ids = payload.parentRollIds;
    }
    else if (payload.parentRollId != null) {
        body.parent_roll_id = payload.parentRollId;
    }
    const response = await api.post("/rolls-stock/", body);
    return mapRollsStock(response.data);
};
export const updateRollsStock = async (rollsStockId, payload) => {
    const body = {
        item_id: payload.itemId,
        rollno: payload.rollno,
        size: payload.size,
        micron: payload.micron,
        netweight: payload.netweight,
        meter: payload.meter,
        grossweight: payload.grossweight,
        wastage: payload.wastage,
        grade_id: payload.gradeId,
        stage: payload.stage,
        parent_roll_id: payload.parentRollId,
    };
    if (payload.consumed !== undefined)
        body.consumed = payload.consumed;
    if ("balanceWeight" in payload)
        body.balance_weight = payload.balanceWeight;
    if ("plainWastage" in payload)
        body.plain_wastage = payload.plainWastage;
    if ("printedWastage" in payload)
        body.printed_wastage = payload.printedWastage;
    if ("inkGsm" in payload)
        body.ink_gsm = payload.inkGsm;
    if ("inkGsmByInkWt" in payload)
        body.ink_gsm_by_ink_wt = payload.inkGsmByInkWt;
    if ("adhesiveOh" in payload)
        body.adhesive_oh = payload.adhesiveOh;
    if ("adhesiveNco" in payload)
        body.adhesive_nco = payload.adhesiveNco;
    if ("ohPercent" in payload)
        body.oh_percent = payload.ohPercent;
    if ("trimWastage" in payload)
        body.trim_wastage = payload.trimWastage;
    if ("lumpsWastage" in payload)
        body.lumps_wastage = payload.lumpsWastage;
    if ("eclOutputWastage" in payload)
        body.ecl_output_wastage = payload.eclOutputWastage;
    if ("eclWastage" in payload)
        body.ecl_wastage = payload.eclWastage;
    if ("laminationWastage" in payload)
        body.lamination_wastage = payload.laminationWastage;
    if ("slitterWastage" in payload)
        body.slitter_wastage = payload.slitterWastage;
    if ("coilRewinding" in payload)
        body.coil_rewinding = payload.coilRewinding;
    if ("slitDirection" in payload)
        body.slit_direction = payload.slitDirection;
    if ("coreSize" in payload)
        body.core_size = payload.coreSize;
    if ("coilDia" in payload)
        body.coil_dia = payload.coilDia;
    if ("jobRepeat" in payload)
        body.job_repeat = payload.jobRepeat;
    if ("wastageReason" in payload)
        body.wastage_reason = payload.wastageReason;
    if ("noOfTag" in payload)
        body.no_of_tag = payload.noOfTag;
    if ("noOfCuts" in payload)
        body.no_of_cuts = payload.noOfCuts;
    if ("operatorName" in payload)
        body.operator_name = payload.operatorName;
    if ("shift" in payload)
        body.shift = payload.shift;
    if ("remark" in payload)
        body.remark = payload.remark;
    const response = await api.patch(`/rolls-stock/${rollsStockId}`, body);
    return mapRollsStock(response.data);
};
export const getWastageReasons = async () => {
    const response = await api.get("/meta/wastage-reasons");
    return Array.isArray(response.data)
        ? response.data.map((r) => String(r).trim()).filter(Boolean)
        : [];
};
export const getRollsStockById = async (id) => {
    const response = await api.get(`/rolls-stock/${id}`);
    return mapRollsStock(response.data);
};
/** Look up a roll by barcode (for inspection scan → add job card). Allowed for Inspection and Stock/Floor. */
export const getRollByBarcode = async (barcode) => {
    const trimmed = (barcode || "").trim();
    if (!trimmed)
        return null;
    try {
        const response = await api.get(`/rolls-stock/by-barcode/${encodeURIComponent(trimmed)}`);
        return mapRollsStock(response.data);
    }
    catch {
        return null;
    }
};
/** Get work order linked to a roll by barcode (child wip_printed → parent → job card → work order). For inspection add job card. */
export const getWorkOrderByRollBarcode = async (barcode) => {
    const trimmed = (barcode || "").trim();
    if (!trimmed)
        return null;
    try {
        const response = await api.get(`/rolls-stock/by-barcode/${encodeURIComponent(trimmed)}/work-order`);
        return {
            workOrderId: response.data.work_order_id,
            woNumber: response.data.wo_number ?? null,
        };
    }
    catch {
        return null;
    }
};
/** Fetch rolls whose parent_roll_id is in the given list (e.g. children of consumed/loaded rolls). */
export const getRollsStockByParentIds = async (parentRollIds, stage) => {
    if (parentRollIds.length === 0)
        return [];
    const params = new URLSearchParams({ parent_roll_ids: parentRollIds.join(",") });
    if (stage != null && stage !== "")
        params.set("stage", stage);
    const response = await api.get(`/rolls-stock/by-parent`, {
        params,
    });
    return response.data.map(mapRollsStock);
};
/** Fetch rolls linked to a work order via parent roll in-movements (e.g. all produced rolls for WO). */
export const getRollsStockByWorkOrder = async (workOrderId, stage) => {
    const params = {};
    if (stage != null && stage !== "")
        params.stage = stage;
    const response = await api.get(`/rolls-stock/by-work-order/${workOrderId}`, { params: Object.keys(params).length ? params : undefined });
    return response.data.map(mapRollsStock);
};
export const deleteRollsStock = async (rollsStockId) => {
    await api.delete(`/rolls-stock/${rollsStockId}`);
};
/** Mark selected rolls as issued (bulk). Returns count updated. */
export const bulkIssueRollsStock = async (ids) => {
    const response = await api.post("/rolls-stock/bulk-issue", { ids });
    return response.data;
};
/** Restore selected rolls (set issued=false, issued_at=null). Returns count updated. */
export const bulkRestoreRollsStock = async (ids) => {
    const response = await api.post("/rolls-stock/bulk-restore", { ids });
    return response.data;
};
/**
 * Request full item-wise export from server (full dataset, no pagination).
 * When issued is false, exports only non-issued rolls; when true, only issued.
 * When stage is provided (e.g. "virgin_rm"), exports only rolls with that stage.
 * Returns blob for download; server generates the .xlsx.
 */
export const exportRollsStockItemWiseXlsx = async (issued, stage) => {
    const params = {};
    if (issued !== undefined)
        params.issued = issued;
    if (stage != null && stage !== "")
        params.stage = stage;
    const response = await api.get("/rolls-stock/export/item-wise", {
        params: Object.keys(params).length ? params : undefined,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
/**
 * Request summary export from server: single sheet grouped by (item code, micron, size).
 * When itemCode is provided, export contains only that item's summary; otherwise all items.
 * When issued is false, exports only non-issued rolls; when true, only issued.
 * When stage is provided (e.g. "virgin_rm"), exports only rolls with that stage.
 * Returns blob for download.
 */
export const exportRollsStockSummaryXlsx = async (itemCode, issued, stage) => {
    const params = {};
    if (itemCode != null && itemCode.trim() !== "")
        params.item_code = itemCode.trim();
    if (issued !== undefined)
        params.issued = issued;
    if (stage != null && stage !== "")
        params.stage = stage;
    const response = await api.get("/rolls-stock/export/summary", {
        params: Object.keys(params).length ? params : undefined,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
/**
 * Size wise report 2: one row per grade, size, and micron.
 * Issued and received are for reportDate; roll weights and closing are current stock.
 */
export const exportRollsStockSizeWise2Xlsx = async (reportDate, itemCode, stage) => {
    const params = {
        report_date: reportDate,
    };
    if (itemCode != null && itemCode.trim() !== "")
        params.item_code = itemCode.trim();
    if (stage != null && stage !== "")
        params.stage = stage;
    const response = await api.get("/rolls-stock/export/size-wise-2", {
        params,
        responseType: "blob",
        timeout: 120000,
    });
    return response.data;
};
