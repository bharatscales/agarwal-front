import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { formatWeightWithMeter } from "@/lib/film-calc"
import type { CurrentRoll } from "@/lib/job-card-api"
import { getRollsStockByWorkOrder } from "@/lib/rolls-stock-api"
import { allowedWipStagesForDept, wipStageLabel } from "@/lib/wo-flow"

export type ProducedRoll = Awaited<ReturnType<typeof getRollsStockByWorkOrder>>[number]

type ParentRoll = NonNullable<ProducedRoll["parentRolls"]>[number]

type JobCardRef = {
  id: number
  operation: string
  jobCardNumber: string
}

export const PRODUCED_ROLL_STAGE_BY_OPERATION: Record<string, string> = {
  Printing: "wip_printed",
  Inspection: "wip_inspection",
  ECL: "wip_ecl",
  Lamination: "wip_lamination",
  Slitting: "finished_goods",
}

export type ProducedRollAssignment = {
  byCardId: Record<number, ProducedRoll[]>
  unassignedByOperation: Record<string, ProducedRoll[]>
}

function cardNumbersOnRoll(roll: ProducedRoll): string[] {
  return (roll.jobCardNumber ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
}

export function assignProducedRolls(
  cards: JobCardRef[],
  rollsByStage: Record<string, ProducedRoll[]>
): ProducedRollAssignment {
  const byCardId: Record<number, ProducedRoll[]> = {}
  const cardsByOperation = new Map<string, JobCardRef[]>()
  for (const card of cards) {
    const list = cardsByOperation.get(card.operation) ?? []
    list.push(card)
    cardsByOperation.set(card.operation, list)
    byCardId[card.id] = []
  }

  const unassignedByOperation: Record<string, ProducedRoll[]> = {}
  for (const [operation, stage] of Object.entries(PRODUCED_ROLL_STAGE_BY_OPERATION)) {
    const rolls = rollsByStage[stage] ?? []
    const opCards = cardsByOperation.get(operation) ?? []
    const numberToCards = new Map<string, JobCardRef[]>()
    for (const card of opCards) {
      const key = card.jobCardNumber.trim()
      const list = numberToCards.get(key) ?? []
      list.push(card)
      numberToCards.set(key, list)
    }

    const unassigned: ProducedRoll[] = []
    for (const roll of rolls) {
      const numbers = cardNumbersOnRoll(roll)
      const matched = [
        ...new Map(
          numbers.flatMap((number) => numberToCards.get(number) ?? []).map((card) => [card.id, card])
        ).values(),
      ]
      if (matched.length > 0) {
        for (const card of matched) byCardId[card.id].push(roll)
        continue
      }
      if (numbers.length === 0 && opCards.length === 1) {
        byCardId[opCards[0].id].push(roll)
        continue
      }
      unassigned.push(roll)
    }
    if (unassigned.length > 0) unassignedByOperation[operation] = unassigned
  }

  return { byCardId, unassignedByOperation }
}

function displayValue(value: unknown) {
  if (value == null || value === "") return "-"
  return String(value)
}

function displayKg(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : `${n.toFixed(2)} kg`
}

function displayMeter(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) || n <= 0 ? "-" : `${Math.round(n)} m`
}

function displayDecimal(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : n.toFixed(2)
}

function displayOhPercent(value: unknown) {
  if (value == null || value === "") return "-"
  const n = Number(value)
  return Number.isNaN(n) ? "-" : `${n.toFixed(2)} %`
}

function isRmFilmStage(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
  return s === "virgin_rm" || s === "rm_balance"
}

function parentRole(
  operation: string,
  stage: string | null | undefined
): "wip" | "rm" | null {
  const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
  if (isRmFilmStage(s)) return "rm"
  if (operation === "ECL" && (s === "wip_printed" || s === "wip_inspection")) return "wip"
  if (
    operation === "Lamination" &&
    (s === "wip_printed" || s === "wip_inspection" || s === "wip_ecl")
  ) {
    return "wip"
  }
  return null
}

function parentsForColumn(row: ProducedRoll, operation: string, role: "wip" | "rm"): ParentRoll[] {
  const parents = row.parentRolls ?? []
  const matched = parents.filter((parent) => parentRole(operation, parent.stage) === role)
  if (matched.length > 0 || parents.some((parent) => parentRole(operation, parent.stage) != null)) {
    return matched
  }
  if (role === "wip") return parents[0] ? [parents[0]] : []
  return parents[1] ? [parents[1]] : []
}

function renderParentLines(parents: ParentRoll[], render: (parent: ParentRoll) => string) {
  if (parents.length === 0) return <div className="text-xs">-</div>
  return (
    <div className="text-xs space-y-0.5">
      {parents.map((parent) => (
        <div key={parent.id}>{render(parent)}</div>
      ))}
    </div>
  )
}

function inputGroupColumns(
  operation: string,
  id: "input1" | "input2",
  label: string,
  role: "wip" | "rm"
): ColumnDef<ProducedRoll> {
  const pick = (row: ProducedRoll) => parentsForColumn(row, operation, role)
  const mergeByParent = {
    mergeRows: true,
    getMergeKey: (row: ProducedRoll) => pick(row).map((parent) => parent.id).join("-") || null,
  }
  return {
    id,
    header: () => <div className="text-center w-full">{label}</div>,
    columns: [
      {
        id: `${id}Structure`,
        header: () => <div>Structure</div>,
        cell: ({ row }) => renderParentLines(pick(row.original), (parent) => displayValue(parent.itemName)),
        meta: mergeByParent,
      },
      {
        id: `${id}Size`,
        header: () => <div>Size</div>,
        cell: ({ row }) =>
          renderParentLines(pick(row.original), (parent) =>
            parent.size != null ? String(parent.size) : "-"
          ),
        meta: mergeByParent,
      },
      {
        id: `${id}Micron`,
        header: () => <div>Micron</div>,
        cell: ({ row }) =>
          renderParentLines(pick(row.original), (parent) =>
            parent.micron != null ? String(parent.micron) : "-"
          ),
        meta: mergeByParent,
      },
      {
        id: `${id}InputWeight`,
        header: () => <div>Input weight</div>,
        cell: ({ row }) =>
          renderParentLines(pick(row.original), (parent) =>
            formatWeightWithMeter(parent.netweight, parent.meter)
          ),
        meta: mergeByParent,
      },
      {
        id: `${id}Wastage`,
        header: () => <div>Wastage</div>,
        cell: ({ row }) => renderParentLines(pick(row.original), (parent) => displayKg(parent.wastage)),
        meta: mergeByParent,
      },
      {
        id: `${id}BalanceWeight`,
        header: () => <div>Balance weight</div>,
        cell: ({ row }) =>
          renderParentLines(pick(row.original), (parent) => displayKg(parent.balanceWeight)),
        meta: mergeByParent,
      },
    ],
  }
}

function singleColumn(id: string, column: ColumnDef<ProducedRoll>): ColumnDef<ProducedRoll> {
  return {
    id,
    header: () => null,
    columns: [column],
  }
}

function kgColumn(key: keyof ProducedRoll, title: string): ColumnDef<ProducedRoll> {
  return {
    accessorKey: key,
    header: () => <div>{title}</div>,
    cell: ({ row }) => <div className="text-xs">{displayKg(row.original[key])}</div>,
  }
}

function textColumn(key: keyof ProducedRoll, title: string): ColumnDef<ProducedRoll> {
  return {
    accessorKey: key,
    header: () => <div>{title}</div>,
    cell: ({ row }) => <div className="text-xs">{displayValue(row.original[key])}</div>,
  }
}

function balanceCell(row: ProducedRoll) {
  const value = row.parentBalanceWeight ?? row.balanceWeight
  return value != null ? `${Number(value).toFixed(2)} kg` : "-"
}

function printingColumns(): ColumnDef<ProducedRoll>[] {
  return [
    textColumn("size", "Size"),
    textColumn("micron", "Micron"),
    {
      accessorKey: "parentNetweight",
      header: () => <div>Input weight (kg)</div>,
      cell: ({ row }) => (
        <div className="text-xs">
          {formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter)}
        </div>
      ),
      meta: { mergeRows: true },
    },
    kgColumn("netweight", "Output weight (kg)"),
    {
      accessorKey: "meter",
      header: () => <div>Meter</div>,
      cell: ({ row }) => <div className="text-xs">{displayMeter(row.original.meter)}</div>,
    },
    kgColumn("plainWastage", "Plain wastage (kg)"),
    kgColumn("printedWastage", "Printed wastage (kg)"),
    textColumn("inkGsm", "Ink gsm"),
    textColumn("inkGsmByInkWt", "Ink gsm (by ink wt)"),
    {
      id: "balanceWeight",
      header: () => <div>Balance weight (kg)</div>,
      cell: ({ row }) => <div className="text-xs">{balanceCell(row.original)}</div>,
    },
  ]
}

function inspectionColumns(): ColumnDef<ProducedRoll>[] {
  return [
    textColumn("size", "Size"),
    textColumn("micron", "Micron"),
    {
      accessorKey: "parentNetweight",
      header: () => <div>Input weight (kg)</div>,
      cell: ({ row }) => (
        <div className="text-xs">
          {formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter)}
        </div>
      ),
      meta: { mergeRows: true },
    },
    kgColumn("netweight", "Output weight (kg)"),
    kgColumn("wastage", "Wastage (kg)"),
    {
      id: "balanceWeight",
      header: () => <div>Balance weight (kg)</div>,
      cell: ({ row }) => <div className="text-xs">{balanceCell(row.original)}</div>,
    },
    textColumn("wastageReason", "Reason of wastage"),
    textColumn("noOfTag", "No. of tag"),
    textColumn("noOfCuts", "No. of cuts"),
    textColumn("operatorName", "Operator name"),
    textColumn("shift", "Shift"),
    textColumn("remark", "Remark"),
  ]
}

function eclColumns(input1Label: string, input2Label: string): ColumnDef<ProducedRoll>[] {
  return [
    inputGroupColumns("ECL", "input1", input1Label, "wip"),
    inputGroupColumns("ECL", "input2", input2Label, "rm"),
    {
      id: "extrusion",
      header: () => <div className="text-center w-full">Extrusion</div>,
      columns: [
        kgColumn("inkGsm", "Coating (kg)"),
        kgColumn("trimWastage", "Trim wastage (kg)"),
        kgColumn("lumpsWastage", "Lumps wastage (kg)"),
        kgColumn("eclOutputWastage", "Output wastage (kg)"),
      ],
    },
    singleColumn("netweightGroup", kgColumn("netweight", "Output weight (kg)")),
    singleColumn("operatorNameGroup", textColumn("operatorName", "Operator name")),
    singleColumn("shiftGroup", textColumn("shift", "Shift")),
  ]
}

function laminationColumns(input1Label: string, input2Label: string): ColumnDef<ProducedRoll>[] {
  return [
    inputGroupColumns("Lamination", "input1", input1Label, "wip"),
    inputGroupColumns("Lamination", "input2", input2Label, "rm"),
    {
      id: "output",
      header: () => <div className="text-center w-full">Output</div>,
      columns: [
        kgColumn("netweight", "Output weight (kg)"),
        {
          accessorKey: "meter",
          header: () => <div>Output meter</div>,
          cell: ({ row }) => <div className="text-xs">{displayMeter(row.original.meter)}</div>,
        },
      ],
    },
    {
      id: "adhesive",
      header: () => <div className="text-center w-full">Adhesive</div>,
      columns: [
        {
          accessorKey: "adhesiveOh",
          header: () => <div>Adhesive OH</div>,
          cell: ({ row }) => <div className="text-xs">{displayDecimal(row.original.adhesiveOh)}</div>,
        },
        {
          accessorKey: "adhesiveNco",
          header: () => <div>Adhesive NCO</div>,
          cell: ({ row }) => <div className="text-xs">{displayDecimal(row.original.adhesiveNco)}</div>,
        },
        {
          accessorKey: "ohPercent",
          header: () => <div>OH %</div>,
          cell: ({ row }) => <div className="text-xs">{displayOhPercent(row.original.ohPercent)}</div>,
        },
      ],
    },
    singleColumn("operatorNameGroup", textColumn("operatorName", "Operator name")),
    singleColumn("shiftGroup", textColumn("shift", "Shift")),
  ]
}

function slittingColumns(): ColumnDef<ProducedRoll>[] {
  return [
    {
      accessorKey: "barcode",
      header: () => <div>Barcode</div>,
      cell: ({ row }) => <div className="font-mono text-xs">{displayValue(row.original.barcode)}</div>,
    },
    kgColumn("trimWastage", "Trim wastage"),
    kgColumn("eclWastage", "ECL wastage"),
    kgColumn("printedWastage", "Print wastage"),
    kgColumn("laminationWastage", "Lamination wastage"),
    kgColumn("slitterWastage", "Slitter wastage"),
    kgColumn("wastage", "Total wastage"),
    textColumn("coilRewinding", "Coil rewinding"),
    textColumn("slitDirection", "Direction"),
    textColumn("coreSize", "Core size"),
    textColumn("coilDia", "Coil dia"),
    {
      id: "jobSize",
      header: () => <div className="text-center w-full">Job size</div>,
      columns: [textColumn("size", "Width"), textColumn("jobRepeat", "Repeat")],
    },
  ]
}

function rowWastageKg(operation: string, row: ProducedRoll): number {
  if (operation === "Printing") {
    if (row.plainWastage != null || row.printedWastage != null) {
      return Number(row.plainWastage || 0) + Number(row.printedWastage || 0)
    }
    return Number(row.wastage || 0)
  }
  if (operation === "ECL" && row.wastage == null) {
    return Number(row.trimWastage || 0) + Number(row.lumpsWastage || 0) + Number(row.eclOutputWastage || 0)
  }
  return Number(row.wastage || 0)
}

function balanceTotal(rows: ProducedRoll[]): number | null {
  const seen = new Map<string, number>()
  for (const row of rows) {
    const parents = row.parentRolls ?? []
    if (parents.length > 0) {
      for (const parent of parents) {
        if (parent.balanceWeight == null) continue
        const key = String(parent.id)
        if (!seen.has(key)) seen.set(key, Number(parent.balanceWeight))
      }
      continue
    }
    const value = row.parentBalanceWeight ?? row.balanceWeight
    if (value == null) continue
    const key =
      row.parentRollIds?.length
        ? row.parentRollIds.join("-")
        : row.parentRollId != null
          ? String(row.parentRollId)
          : `row-${row.id}`
    if (!seen.has(key)) seen.set(key, Number(value))
  }
  if (seen.size === 0) return null
  return [...seen.values()].reduce((sum, value) => sum + value, 0)
}

function ProducedRollTotals({ operation, rows }: { operation: string; rows: ProducedRoll[] }) {
  const output = rows.reduce((sum, row) => sum + Number(row.netweight || 0), 0)
  const wastage = rows.reduce((sum, row) => sum + rowWastageKg(operation, row), 0)
  const balance = operation === "Slitting" ? null : balanceTotal(rows)
  const showOutput = operation !== "Slitting"
  return (
    <p className="text-xs text-gray-600 dark:text-gray-400">
      Rolls {rows.length}
      {showOutput ? ` · Output ${output.toFixed(2)} kg` : ""}
      {` · Wastage ${wastage.toFixed(2)} kg`}
      {balance != null ? ` · Balance ${balance.toFixed(2)} kg` : ""}
    </p>
  )
}

type JobCardProducedRollsProps = {
  operation: string
  rolls: ProducedRoll[]
  skippedOperations?: string[] | null
  loadedRoll?: CurrentRoll | null
  loading?: boolean
}

export function JobCardProducedRolls({
  operation,
  rolls,
  skippedOperations,
  loadedRoll,
  loading = false,
}: JobCardProducedRollsProps) {
  const dualOperation = operation === "ECL" || operation === "Lamination" ? operation : null
  const dualInput = dualOperation
    ? {
        input1: `Input 1 (${wipStageLabel(allowedWipStagesForDept(dualOperation, skippedOperations)[0])})`,
        input2: "Input 2 (RM Film)",
      }
    : null

  const columns = useMemo(() => {
    if (operation === "Printing") return printingColumns()
    if (operation === "Inspection") return inspectionColumns()
    if (operation === "ECL" && dualInput) return eclColumns(dualInput.input1, dualInput.input2)
    if (operation === "Lamination" && dualInput) return laminationColumns(dualInput.input1, dualInput.input2)
    if (operation === "Slitting") return slittingColumns()
    return []
  }, [operation, dualInput?.input1, dualInput?.input2])

  if (columns.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Produced rolls</p>
        {!loading && rolls.length > 0 && <ProducedRollTotals operation={operation} rows={rolls} />}
      </div>
      {operation === "Slitting" && loadedRoll && (
        <p className="text-xs text-gray-700 dark:text-gray-300">
          Input weight {formatWeightWithMeter(loadedRoll.netweight, loadedRoll.meter)}
          {loadedRoll.barcode ? ` · ${loadedRoll.barcode}` : ""}
        </p>
      )}
      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Loading produced rolls…</p>
      ) : rolls.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">No produced rolls for this job card.</p>
      ) : (
        <DataTable
          columns={columns}
          data={rolls}
          getRowId={(row) => String(row.id)}
          compact
          size="xs"
          scrollable
          scrollHeight="320px"
        />
      )}
    </div>
  )
}
