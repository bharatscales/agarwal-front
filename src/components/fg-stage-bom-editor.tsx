import { useMemo, useRef } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  FgBomEditor,
  createBomEditorLine,
  validateBomEditorLines,
  type BomEditorLine,
} from "@/components/fg-bom-editor"
import type { BomLine, BomLinePayload } from "@/lib/item-api"
import {
  FG_BOM_MULTI_STAGE_OPERATIONS,
  FG_BOM_NO_RM_OPERATIONS,
  FG_BOM_STAGE_OPERATIONS,
} from "@/lib/item-api"

export type BomStageEditor = {
  id: number
  operation: string
  stageSeq: number
  lines: BomEditorLine[]
}

const STAGE_ORDER = [...FG_BOM_STAGE_OPERATIONS]
const MULTI_STAGE_SET = new Set<string>(FG_BOM_MULTI_STAGE_OPERATIONS)
const NO_RM_SET = new Set<string>(FG_BOM_NO_RM_OPERATIONS)
const PRINTING_OP = "Printing"
const INSPECTION_OP = "Inspection"
const SLITTING_OP = "Slitting"

function stageSortKey(operation: string, stageSeq: number): number {
  const i = STAGE_ORDER.indexOf(operation as (typeof STAGE_ORDER)[number])
  const opOrder = i >= 0 ? i : STAGE_ORDER.length
  return opOrder * 1000 + stageSeq
}

function stageKey(operation: string, stageSeq: number): string {
  return `${operation}:${stageSeq}`
}

export function formatStageLabel(
  operation: string,
  stageSeq: number,
  countForOperation = 1,
): string {
  if (MULTI_STAGE_SET.has(operation) && (countForOperation > 1 || stageSeq > 1)) {
    return `${operation} ${stageSeq}`
  }
  return operation
}

export function createBomStageEditor(
  id: number,
  operation: string,
  stageSeq: number,
): BomStageEditor {
  return {
    id,
    operation,
    stageSeq,
    lines: NO_RM_SET.has(operation) ? [] : [createBomEditorLine(1, 1)],
  }
}

function nextStageSeq(stages: BomStageEditor[], operation: string): number {
  const seqs = stages.filter((s) => s.operation === operation).map((s) => s.stageSeq)
  return seqs.length > 0 ? Math.max(...seqs) + 1 : 1
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function bomLinesToStageEditors(lines: BomLine[]): BomStageEditor[] {
  const byStage = new Map<string, BomLine[]>()
  for (const line of lines) {
    const op = line.operation?.trim() || PRINTING_OP
    const seq = line.stageSeq ?? 1
    const key = stageKey(op, seq)
    const list = byStage.get(key) ?? []
    list.push(line)
    byStage.set(key, list)
  }

  const stages: BomStageEditor[] = []
  let stageId = 1
  const sortedKeys = [...byStage.keys()].sort((a, b) => {
    const [opA, seqA] = a.split(":")
    const [opB, seqB] = b.split(":")
    return stageSortKey(opA, parseInt(seqA, 10)) - stageSortKey(opB, parseInt(seqB, 10))
  })

  for (const key of sortedKeys) {
    const [operation, seqStr] = key.split(":")
    const stageSeq = parseInt(seqStr, 10)
    const opLines = byStage.get(key) ?? []
    opLines.sort((a, b) => (a.layerNo ?? 0) - (b.layerNo ?? 0))
    const rmLines = opLines.filter((l) => l.rmItemId != null)
    stages.push({
      id: stageId++,
      operation,
      stageSeq,
      lines: NO_RM_SET.has(operation)
        ? []
        : rmLines.length > 0
          ? rmLines.map((l, i) => ({
              id: l.id ?? i + 1,
              layerNo: l.layerNo ?? i + 1,
              rmItemId: String(l.rmItemId),
              rmItemGroup: l.rmItemGroup ?? "",
              size: l.size != null ? String(l.size) : "",
              micron: l.micron != null ? String(l.micron) : "",
              gsm: l.gsm != null ? String(l.gsm) : "",
            }))
          : [createBomEditorLine(1, 1)],
    })
  }
  return stages
}

export function stageEditorsToPayload(stages: BomStageEditor[]): BomLinePayload[] {
  const out: BomLinePayload[] = []
  for (const stage of stages) {
    if (stage.operation === INSPECTION_OP || stage.operation === SLITTING_OP) {
      out.push({
        operation: stage.operation,
        stageSeq: stage.stageSeq,
        layerNo: 1,
        rmItemId: null,
      })
      continue
    }
    const lines = stage.lines
      .filter((r) => r.rmItemId.trim())
      .map((r, index) => ({
        operation: stage.operation,
        stageSeq: stage.stageSeq,
        layerNo: index + 1,
        rmItemId: parseInt(r.rmItemId, 10),
        size: parseOptionalNumber(r.size),
        micron: parseOptionalNumber(r.micron),
        gsm: parseOptionalNumber(r.gsm),
      }))
    out.push(...lines)
  }
  return out
}

export function validateBomStages(stages: BomStageEditor[]): string | null {
  for (const stage of stages) {
    if (NO_RM_SET.has(stage.operation)) continue
    const error = validateBomEditorLines(
      stage.lines,
      formatStageLabel(stage.operation, stage.stageSeq),
    )
    if (error) return error
  }
  return null
}

export type BomStageGroup = {
  operation: string
  stageSeq: number
  label: string
  lines: BomLine[]
}

/** Group readonly BOM lines by operation + stage for work-order display. */
export function groupBomLinesByStage(lines: BomLine[]): BomStageGroup[] {
  const byStage = new Map<string, BomLine[]>()
  for (const line of lines) {
    const op = line.operation?.trim() || PRINTING_OP
    const seq = line.stageSeq ?? 1
    const key = stageKey(op, seq)
    const list = byStage.get(key) ?? []
    list.push(line)
    byStage.set(key, list)
  }

  const countByOp = new Map<string, number>()
  for (const key of byStage.keys()) {
    const op = key.split(":")[0]
    countByOp.set(op, (countByOp.get(op) ?? 0) + 1)
  }

  return [...byStage.entries()]
    .sort(([a], [b]) => {
      const [opA, seqA] = a.split(":")
      const [opB, seqB] = b.split(":")
      return stageSortKey(opA, parseInt(seqA, 10)) - stageSortKey(opB, parseInt(seqB, 10))
    })
    .map(([key, stageLines]) => {
      const [operation, seqStr] = key.split(":")
      const stageSeq = parseInt(seqStr, 10)
      return {
        operation,
        stageSeq,
        label: formatStageLabel(operation, stageSeq, countByOp.get(operation) ?? 1),
        lines: [...stageLines].sort((a, b) => (a.layerNo ?? 0) - (b.layerNo ?? 0)),
      }
    })
}

type FgStageBomEditorProps = {
  value: BomStageEditor[]
  onChange: (stages: BomStageEditor[]) => void
}

export function FgStageBomEditor({ value, onChange }: FgStageBomEditorProps) {
  const nextStageId = useRef(1000)

  const usedSingleStages = useMemo(() => {
    const used = new Set<string>()
    for (const stage of value) {
      if (!MULTI_STAGE_SET.has(stage.operation)) {
        used.add(stage.operation)
      }
    }
    return used
  }, [value])

  const availableStages = STAGE_ORDER.filter(
    (op) => MULTI_STAGE_SET.has(op) || !usedSingleStages.has(op),
  )

  const countByOperation = useMemo(() => {
    const counts = new Map<string, number>()
    for (const stage of value) {
      counts.set(stage.operation, (counts.get(stage.operation) ?? 0) + 1)
    }
    return counts
  }, [value])

  const sortedStages = useMemo(
    () =>
      [...value].sort(
        (a, b) => stageSortKey(a.operation, a.stageSeq) - stageSortKey(b.operation, b.stageSeq),
      ),
    [value],
  )

  const addStage = (operation: string) => {
    const id = nextStageId.current++
    const stageSeq = nextStageSeq(value, operation)
    onChange([...value, createBomStageEditor(id, operation, stageSeq)])
  }

  const removeStage = (stageId: number) => {
    onChange(value.filter((s) => s.id !== stageId))
  }

  const updateStageLines = (stageId: number, lines: BomEditorLine[]) => {
    onChange(value.map((s) => (s.id === stageId ? { ...s, lines } : s)))
  }

  const noRmMessage =
    (operation: string) =>
      operation === INSPECTION_OP
        ? "No RM — inspection uses WIP Printing from the prior stage."
        : "No RM — slitting uses WIP from the prior stage."

  return (
    <div className="space-y-4">
      {sortedStages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No stages added yet. Add a manufacturing stage to define routing and RM structure.
        </p>
      ) : (
        sortedStages.map((stage) => (
          <div
            key={stage.id}
            className="rounded-lg border border-border bg-muted/10 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">
                {formatStageLabel(
                  stage.operation,
                  stage.stageSeq,
                  countByOperation.get(stage.operation) ?? 1,
                )}
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeStage(stage.id)}
                aria-label={`Remove ${stage.operation} stage`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {NO_RM_SET.has(stage.operation) ? (
              <p className="text-sm text-muted-foreground">{noRmMessage(stage.operation)}</p>
            ) : (
              <FgBomEditor
                mode="edit"
                value={stage.lines}
                onChange={(lines) => updateStageLines(stage.id, lines)}
              />
            )}
          </div>
        ))
      )}

      {availableStages.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {availableStages.map((op) => (
            <Button
              key={op}
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => addStage(op)}
            >
              <Plus className="h-4 w-4" />
              Add {op}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
