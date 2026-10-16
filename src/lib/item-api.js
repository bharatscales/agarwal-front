import api from "./axios";
import { filmGsm } from "./film-calc";
import { isGsmBomItemGroup, isRmFilmGroup } from "./rm-item-groups";
/** Manufacturing stages allowed on FG variety BOM. */
export const FG_BOM_STAGE_OPERATIONS = [
    "Printing",
    "Inspection",
    "ECL",
    "Lamination",
    "Slitting",
];
/** ECL and Lamination may be added multiple times per FG variety. */
export const FG_BOM_MULTI_STAGE_OPERATIONS = ["ECL", "Lamination"];
/** Stages that exist for routing only and have no RM structure. */
export const FG_BOM_NO_RM_OPERATIONS = ["Inspection", "Slitting"];
const mapBomLine = (row) => ({
    id: row.id,
    fgItemId: row.fg_item_id,
    operation: row.operation,
    stageSeq: row.stage_seq ?? 1,
    layerNo: row.layer_no,
    rmItemId: row.rm_item_id ?? null,
    rmItemCode: row.rm_item_code ?? null,
    rmItemName: row.rm_item_name ?? null,
    rmItemAbv: (row.rm_item_abv ?? row.rmItemAbv ?? "").trim() || null,
    rmItemGroup: row.rm_item_group ?? null,
    rmDensity: row.rm_density ?? null,
    size: row.size ?? null,
    micron: row.micron ?? null,
    gsm: row.gsm ?? null,
});
const formatStructureNumber = (value) => {
    if (value == null)
        return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0)
        return null;
    return String(Math.round(n * 1000) / 1000);
};
const structureTokenFromBomLine = (line) => {
    const abv = (line.rmItemAbv || "").trim();
    if (!abv)
        return null;
    const amount = isRmFilmGroup(line.rmItemGroup)
        ? formatStructureNumber(line.micron)
        : isGsmBomItemGroup(line.rmItemGroup)
            ? formatStructureNumber(line.gsm)
            : null;
    if (amount == null)
        return null;
    return `${amount} ${abv}`;
};
/** Prefill order-book specs from an FG variety BOM. */
export const specsFromFgBom = (lines) => {
    const withRm = lines.filter((l) => l.rmItemId != null);
    const filmLayers = withRm.filter((l) => isRmFilmGroup(l.rmItemGroup));
    const structure = withRm
        .map(structureTokenFromBomLine)
        .filter((token) => Boolean(token))
        .join(" / ");
    const sizeLine = filmLayers.find((l) => l.size != null) ?? withRm.find((l) => l.size != null);
    let total = 0;
    let hasGsm = false;
    for (const line of withRm) {
        const gsm = isRmFilmGroup(line.rmItemGroup)
            ? filmGsm(line.rmDensity, line.micron) ?? (line.gsm != null ? Number(line.gsm) : null)
            : line.gsm != null
                ? Number(line.gsm)
                : null;
        if (gsm != null && Number.isFinite(gsm) && gsm > 0) {
            total += gsm;
            hasGsm = true;
        }
    }
    return {
        totalGsm: hasGsm ? String(Math.round(total * 100) / 100) : "",
        size: sizeLine?.size != null ? String(sizeLine.size) : "",
        structure,
    };
};
const mapItem = (item) => ({
    id: item.id,
    itemCode: item.item_code,
    itemName: item.name,
    abv: item.abv ?? null,
    itemGroup: item.item_group,
    partyId: item.party_id,
    partyCode: item.party_code,
    partyName: item.party_name,
    density: item.density ?? null,
    routing: Array.isArray(item.routing) ? item.routing : [],
    uom: item.uom || "",
});
export const getItems = async (skip = 0, limit = 100) => {
    const response = await api.get(`/item/?skip=${skip}&limit=${limit}`);
    return response.data.map(mapItem);
};
export const getItem = async (itemId) => {
    const response = await api.get(`/item/${itemId}`);
    return mapItem(response.data);
};
const fillMissingRmAbv = async (lines) => {
    const missingIds = [
        ...new Set(lines
            .filter((line) => line.rmItemId != null && !(line.rmItemAbv || "").trim())
            .map((line) => line.rmItemId)),
    ];
    if (missingIds.length === 0)
        return lines;
    const fetched = await Promise.all(missingIds.map((id) => api
        .get(`/item/${id}`)
        .then((res) => mapItem(res.data))
        .catch(() => null)));
    const abvById = new Map(fetched
        .filter((item) => item != null)
        .map((item) => [item.id, (item.abv || "").trim() || null]));
    return lines.map((line) => {
        if ((line.rmItemAbv || "").trim() || line.rmItemId == null)
            return line;
        return { ...line, rmItemAbv: abvById.get(line.rmItemId) ?? null };
    });
};
export const getItemBom = async (itemId) => {
    const response = await api.get(`/item/${itemId}/bom`);
    return fillMissingRmAbv(response.data.map(mapBomLine));
};
export const getItemsByGroupForMenu = async (group) => {
    const response = await api.get(`/item/menu/by-group`, {
        params: { group },
    });
    return response.data;
};
/** FG variety items for the given party (for work order item dropdown). */
export const getItemsFgVarietyByParty = async (partyId) => {
    const response = await api.get(`/meta/items-fg-variety-by-party`, {
        params: { party_id: partyId },
    });
    return response.data.map(mapItem);
};
const bomLinesBody = (lines) => lines.map((l) => ({
    operation: l.operation,
    stage_seq: l.stageSeq,
    layer_no: l.layerNo,
    rm_item_id: l.rmItemId ?? null,
    size: l.size ?? null,
    micron: l.micron ?? null,
    gsm: l.gsm ?? null,
}));
export const createItem = async (payload) => {
    const body = {
        item_code: payload.itemCode,
        name: payload.itemName,
        abv: payload.abv?.trim() || null,
        item_group: payload.itemGroup,
        party_id: payload.partyId ?? null,
        density: payload.density ?? null,
        uom_id: payload.uomId || null,
    };
    if (payload.bomLines !== undefined) {
        body.bom_lines = bomLinesBody(payload.bomLines);
    }
    const response = await api.post("/item/", body);
    return mapItem(response.data);
};
export const updateItem = async (itemId, payload) => {
    const body = {};
    if (payload.itemCode !== undefined)
        body.item_code = payload.itemCode;
    if (payload.itemName !== undefined)
        body.name = payload.itemName;
    if (payload.abv !== undefined)
        body.abv = payload.abv?.trim() || null;
    if (payload.itemGroup !== undefined)
        body.item_group = payload.itemGroup;
    if (payload.partyId !== undefined)
        body.party_id = payload.partyId ?? null;
    if (payload.density !== undefined)
        body.density = payload.density ?? null;
    if (payload.uomId !== undefined)
        body.uom_id = payload.uomId;
    if (payload.bomLines !== undefined)
        body.bom_lines = bomLinesBody(payload.bomLines);
    const response = await api.patch(`/item/${itemId}`, body);
    return mapItem(response.data);
};
export const deleteItem = async (itemId) => {
    await api.delete(`/item/${itemId}`);
};
