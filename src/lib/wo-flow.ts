export type FloorSkipOperation = "Inspection" | "ECL" | "Lamination" | "Slitting"

export const SKIPPABLE_OPERATIONS: FloorSkipOperation[] = [
  "Inspection",
  "ECL",
  "Lamination",
  "Slitting",
]

const PREVIOUS_OPERATION: Record<FloorSkipOperation, "Printing" | FloorSkipOperation> = {
  Inspection: "Printing",
  ECL: "Inspection",
  Lamination: "ECL",
  Slitting: "Lamination",
}

const STAGE_AFTER: Record<"Printing" | "Inspection" | "ECL" | "Lamination", string> = {
  Printing: "wip_printed",
  Inspection: "wip_inspection",
  ECL: "wip_ecl",
  Lamination: "wip_lamination",
}

export function normalizeRollStage(stage: string | null | undefined): string {
  return (stage ?? "").toLowerCase().replace(/-/g, "_")
}

export function normalizeSkippedOperations(raw: string[] | null | undefined): string[] {
  if (!raw) return []
  return raw.filter(Boolean)
}

export function isOperationSkipped(
  skipped: string[] | null | undefined,
  operation: FloorSkipOperation
): boolean {
  return normalizeSkippedOperations(skipped).includes(operation)
}

/** WIP stage the department may load, walking back through skipped operations. */
export function allowedWipStagesForDept(
  operation: FloorSkipOperation,
  skipped: string[] | null | undefined
): string[] {
  const skippedSet = new Set(normalizeSkippedOperations(skipped))
  let previous: "Printing" | FloorSkipOperation = PREVIOUS_OPERATION[operation]
  while (previous !== "Printing" && skippedSet.has(previous)) {
    previous = PREVIOUS_OPERATION[previous as FloorSkipOperation] ?? "Printing"
  }
  return [STAGE_AFTER[previous as keyof typeof STAGE_AFTER]]
}

export function isAllowedWipStage(
  stage: string | null | undefined,
  allowed: string[]
): boolean {
  return allowed.includes(normalizeRollStage(stage))
}

export function wipStageLabel(stage: string | null | undefined): string {
  const s = normalizeRollStage(stage)
  if (s === "wip_printed") return "WIP Printing"
  if (s === "wip_inspection") return "WIP Inspection"
  if (s === "wip_ecl") return "WIP ECL"
  if (s === "wip_lamination") return "WIP Lamination"
  return stage || "—"
}
