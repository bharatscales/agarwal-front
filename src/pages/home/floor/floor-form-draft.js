const STORAGE_KEY = "floor-workstation-drafts";
const DEPARTMENTS = [
    "printing",
    "inspection",
    "lamination",
    "ecl",
    "slitting",
];
function isDepartment(value) {
    return DEPARTMENTS.includes(value);
}
function isDraftForm(value) {
    if (!value || typeof value !== "object")
        return false;
    const form = value;
    return typeof form.jobCardId === "number" && !!form.roll && typeof form.roll.id === "number";
}
function readStore() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return { floorView: null, selectedWorkOrderIds: {}, forms: {} };
        const parsed = JSON.parse(raw);
        const selectedWorkOrderIds = {};
        const forms = {};
        const storedIds = parsed.selectedWorkOrderIds;
        const storedForms = parsed.forms;
        for (const department of DEPARTMENTS) {
            const id = storedIds && typeof storedIds === "object" ? storedIds[department] : undefined;
            if (typeof id === "number" && Number.isFinite(id))
                selectedWorkOrderIds[department] = id;
            const form = storedForms && typeof storedForms === "object" ? storedForms[department] : undefined;
            if (isDraftForm(form))
                forms[department] = form;
        }
        return {
            floorView: isDepartment(parsed.floorView) ? parsed.floorView : null,
            selectedWorkOrderIds,
            forms,
        };
    }
    catch {
        return { floorView: null, selectedWorkOrderIds: {}, forms: {} };
    }
}
export function readFloorView() {
    return readStore().floorView;
}
export function readSelectedWorkOrderIds() {
    return readStore().selectedWorkOrderIds;
}
export function readDepartmentForm(department) {
    const form = readStore().forms[department];
    return form ? form : null;
}
export function writeFloorDrafts(snapshot) {
    const selectedWorkOrderIds = {};
    const forms = {};
    for (const department of DEPARTMENTS) {
        const id = snapshot.selectedWorkOrderIds[department];
        if (typeof id === "number" && Number.isFinite(id))
            selectedWorkOrderIds[department] = id;
        const form = snapshot.forms[department];
        if (isDraftForm(form))
            forms[department] = form;
    }
    const next = {
        floorView: isDepartment(snapshot.floorView) ? snapshot.floorView : null,
        selectedWorkOrderIds,
        forms,
    };
    try {
        const empty = next.floorView == null &&
            Object.keys(next.selectedWorkOrderIds).length === 0 &&
            Object.keys(next.forms).length === 0;
        if (empty)
            sessionStorage.removeItem(STORAGE_KEY);
        else
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    catch {
        // Drafts are best-effort when storage is unavailable.
    }
}
export function withFreshLoadedRoll(prev, fresh) {
    return {
        ...prev,
        jobCardNumber: fresh.jobCardNumber,
        jobCardId: fresh.jobCardId,
        roll: fresh.roll,
    };
}
