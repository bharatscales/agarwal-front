import type { FloorDepartmentId } from "../constants"

const STORAGE_KEY = "floor-workstation-drafts"

const DEPARTMENTS: FloorDepartmentId[] = [
  "printing",
  "inspection",
  "lamination",
  "ecl",
  "slitting",
]

type DraftForm = {
  jobCardId: number
  roll: { id: number }
}

type FloorFormDraftStore = {
  floorView: FloorDepartmentId | null
  selectedWorkOrderIds: Partial<Record<FloorDepartmentId, number>>
  forms: Partial<Record<FloorDepartmentId, DraftForm>>
}

export type FloorDraftSnapshot = {
  floorView: FloorDepartmentId | null
  selectedWorkOrderIds: Partial<Record<FloorDepartmentId, number | null>>
  forms: Partial<Record<FloorDepartmentId, unknown>>
}

function isDepartment(value: unknown): value is FloorDepartmentId {
  return DEPARTMENTS.includes(value as FloorDepartmentId)
}

function isDraftForm(value: unknown): value is DraftForm {
  if (!value || typeof value !== "object") return false
  const form = value as { jobCardId?: unknown; roll?: { id?: unknown } }
  return typeof form.jobCardId === "number" && !!form.roll && typeof form.roll.id === "number"
}

function readStore(): FloorFormDraftStore {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return { floorView: null, selectedWorkOrderIds: {}, forms: {} }
    const parsed = JSON.parse(raw) as Partial<FloorFormDraftStore>
    const selectedWorkOrderIds: Partial<Record<FloorDepartmentId, number>> = {}
    const forms: Partial<Record<FloorDepartmentId, DraftForm>> = {}
    const storedIds = parsed.selectedWorkOrderIds
    const storedForms = parsed.forms
    for (const department of DEPARTMENTS) {
      const id = storedIds && typeof storedIds === "object" ? storedIds[department] : undefined
      if (typeof id === "number" && Number.isFinite(id)) selectedWorkOrderIds[department] = id
      const form = storedForms && typeof storedForms === "object" ? storedForms[department] : undefined
      if (isDraftForm(form)) forms[department] = form
    }
    return {
      floorView: isDepartment(parsed.floorView) ? parsed.floorView : null,
      selectedWorkOrderIds,
      forms,
    }
  } catch {
    return { floorView: null, selectedWorkOrderIds: {}, forms: {} }
  }
}

export function readFloorView(): FloorDepartmentId | null {
  return readStore().floorView
}

export function readSelectedWorkOrderIds(): Partial<Record<FloorDepartmentId, number>> {
  return readStore().selectedWorkOrderIds
}

export function readDepartmentForm<T>(department: FloorDepartmentId): T | null {
  const form = readStore().forms[department]
  return form ? (form as T) : null
}

export function writeFloorDrafts(snapshot: FloorDraftSnapshot): void {
  const selectedWorkOrderIds: Partial<Record<FloorDepartmentId, number>> = {}
  const forms: Partial<Record<FloorDepartmentId, DraftForm>> = {}
  for (const department of DEPARTMENTS) {
    const id = snapshot.selectedWorkOrderIds[department]
    if (typeof id === "number" && Number.isFinite(id)) selectedWorkOrderIds[department] = id
    const form = snapshot.forms[department]
    if (isDraftForm(form)) forms[department] = form
  }
  const next: FloorFormDraftStore = {
    floorView: isDepartment(snapshot.floorView) ? snapshot.floorView : null,
    selectedWorkOrderIds,
    forms,
  }
  try {
    const empty =
      next.floorView == null &&
      Object.keys(next.selectedWorkOrderIds).length === 0 &&
      Object.keys(next.forms).length === 0
    if (empty) sessionStorage.removeItem(STORAGE_KEY)
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Drafts are best-effort when storage is unavailable.
  }
}

export function withFreshLoadedRoll<
  T extends { jobCardNumber: string; jobCardId: number; roll: { id: number } },
>(
  prev: T,
  fresh: { jobCardNumber: string; jobCardId: number; roll: T["roll"] }
): T {
  return {
    ...prev,
    jobCardNumber: fresh.jobCardNumber,
    jobCardId: fresh.jobCardId,
    roll: fresh.roll,
  }
}
