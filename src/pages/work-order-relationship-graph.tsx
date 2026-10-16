import { useEffect, useMemo, useRef, useState } from "react"
import {
  RGHooks,
  RGJunctionPoint,
  RGLineShape,
  RGNodeShape,
  RGProvider,
  RGSlotOnNode,
  RelationGraph,
  type JsonLine,
  type JsonNode,
  type RGNodeSlotProps,
  type RGOptions,
} from "@relation-graph/react"
import "@relation-graph/react/style.css"

import { getRollsStockByParentIds } from "@/lib/rolls-stock-api"
import { normalizeRollStage } from "@/lib/wo-flow"
import { cn } from "@/lib/utils"
import type { ProducedRoll } from "@/pages/work-order-produced-rolls"

type ColumnId = "rm" | "printing" | "inspection" | "ecl" | "lamination" | "slitting"

type NodeKind = "roll" | "parent" | "balance" | "ink" | "adhesive" | "extrusion" | "wastage"

type CardPayload = {
  kind: NodeKind
  title: string
  subtitle?: string
  lines: string[]
}

type FlowNode = CardPayload & {
  id: string
  column: ColumnId
  anchorId?: string
  sortKey: number
  width: number
  height: number
  x?: number
  y?: number
}

type ParentMeta = {
  id: number
  itemName: string
  size: number | null
  micron: number | null
  netweight: number | null
  meter: number | null
  balanceWeight: number | null
  stage: string | null
}

const COLUMNS: { id: ColumnId; label: string }[] = [
  { id: "rm", label: "RM" },
  { id: "printing", label: "Printing" },
  { id: "inspection", label: "Inspection" },
  { id: "ecl", label: "ECL" },
  { id: "lamination", label: "Lamination" },
  { id: "slitting", label: "Slitting" },
]

const MAIN_W = 220
const SAT_W = 196
const COL_GAP = 72
const ROW_GAP = 32
const PAD = 16
const PITCH = MAIN_W + 12 + SAT_W + COL_GAP
const INPUT_KIND = new Set<NodeKind>(["ink", "adhesive", "extrusion"])

const KIND_CLASS: Record<NodeKind, string> = {
  roll: "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
  parent: "border-slate-400 bg-slate-50 dark:border-slate-500 dark:bg-slate-800",
  balance: "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950",
  ink: "border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950",
  adhesive: "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950",
  extrusion: "border-orange-400 bg-orange-50 dark:border-orange-600 dark:bg-orange-950",
  wastage: "border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-950",
}

const SATELLITE_COLOR: Partial<Record<NodeKind, string>> = {
  balance: "#d97706",
  wastage: "#e11d48",
  ink: "#7c3aed",
  adhesive: "#2563eb",
  extrusion: "#ea580c",
}

const GRAPH_OPTIONS: RGOptions = {
  showToolBar: false,
  backgroundColor: "transparent",
  disableDragNode: true,
  disableDragLine: true,
  wheelEventAction: "zoom",
  dragEventAction: "move",
  defaultExpandHolderPosition: "hide",
  defaultNodeShape: RGNodeShape.rect,
  defaultNodeBorderWidth: 0,
  defaultNodeColor: "transparent",
  defaultNodeBorderColor: "transparent",
  defaultJunctionPoint: RGJunctionPoint.border,
  defaultLineShape: RGLineShape.StandardCurve,
  defaultLineColor: "#94a3b8",
  defaultLineWidth: 1.5,
  placeOtherGroup: false,
  layout: { layoutName: "fixed" },
}

function rollNodeId(id: number) {
  return `roll-${id}`
}

function columnForStage(stage: string | null | undefined): ColumnId {
  const value = normalizeRollStage(stage)
  if (value === "wip_printed") return "printing"
  if (value === "wip_inspection") return "inspection"
  if (value === "wip_ecl") return "ecl"
  if (value === "wip_lamination") return "lamination"
  if (value === "finished_goods") return "slitting"
  return "rm"
}

function stageLabel(stage: string | null | undefined) {
  const value = normalizeRollStage(stage)
  if (value === "virgin_rm") return "RM"
  if (value === "rm_balance") return "RM balance"
  if (value === "wip_printed") return "Printing"
  if (value === "wip_inspection") return "Inspection"
  if (value === "wip_ecl") return "ECL"
  if (value === "wip_lamination") return "Lamination"
  if (value === "finished_goods") return "Slitting"
  return stage || "Roll"
}

function positive(value: unknown): number | null {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function kg(value: number) {
  return `${value.toFixed(2)} kg`
}

function decimal(value: unknown) {
  if (value == null || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n.toFixed(2)
}

function sizeLine(size?: number | null, micron?: number | null) {
  const width = size != null && Number(size) > 0 ? String(size) : ""
  const thick = micron != null && Number(micron) > 0 ? `${micron} µ` : ""
  if (width && thick) return `${width} × ${thick}`
  return width || thick || null
}

function weightLine(net?: number | null, meter?: number | null) {
  const parts: string[] = []
  if (net != null && Number.isFinite(Number(net))) parts.push(kg(Number(net)))
  if (meter != null && Number(meter) > 0) parts.push(`${Math.round(Number(meter))} m`)
  return parts.length > 0 ? parts.join(" · ") : null
}

function cardHeight(lineCount: number, subtitle: boolean) {
  return Math.max(64, 12 + 16 + (subtitle ? 14 : 0) + lineCount * 15 + 8)
}

function parentsOf(roll: ProducedRoll): ParentMeta[] {
  if (roll.parentRolls && roll.parentRolls.length > 0) {
    return roll.parentRolls.map((parent) => ({
      id: parent.id,
      itemName: parent.itemName ?? "",
      size: parent.size ?? null,
      micron: parent.micron ?? null,
      netweight: parent.netweight ?? null,
      meter: parent.meter ?? null,
      balanceWeight: parent.balanceWeight ?? null,
      stage: parent.stage ?? null,
    }))
  }
  const ids = roll.parentRollIds?.length
    ? roll.parentRollIds
    : roll.parentRollId != null
      ? [roll.parentRollId]
      : []
  return ids.map((id, index) => ({
    id,
    itemName: "",
    size: null,
    micron: null,
    netweight: index === 0 ? roll.parentNetweight ?? null : null,
    meter: index === 0 ? roll.parentMeter ?? null : null,
    balanceWeight: index === 0 ? roll.parentBalanceWeight ?? null : null,
    stage: null,
  }))
}

function collectParentIds(rolls: ProducedRoll[]) {
  const ids = new Set<number>()
  for (const roll of rolls) {
    for (const parent of parentsOf(roll)) ids.add(parent.id)
  }
  return [...ids]
}

function wastageLines(column: ColumnId, roll: ProducedRoll): string[] {
  if (column === "printing") {
    const lines: string[] = []
    const plain = positive(roll.plainWastage)
    const printed = positive(roll.printedWastage)
    if (plain) lines.push(`Plain ${kg(plain)}`)
    if (printed) lines.push(`Printed ${kg(printed)}`)
    if (lines.length === 0) {
      const total = positive(roll.wastage)
      if (total) lines.push(kg(total))
    }
    return lines
  }
  if (column === "inspection") {
    const lines: string[] = []
    const total = positive(roll.wastage)
    if (total) lines.push(kg(total))
    if (roll.wastageReason) lines.push(String(roll.wastageReason))
    return lines
  }
  if (column === "slitting") {
    const lines: string[] = []
    const parts: [string, unknown][] = [
      ["Trim", roll.trimWastage],
      ["ECL", roll.eclWastage],
      ["Print", roll.printedWastage],
      ["Lamination", roll.laminationWastage],
      ["Slitter", roll.slitterWastage],
    ]
    for (const [label, value] of parts) {
      const amount = positive(value)
      if (amount) lines.push(`${label} ${kg(amount)}`)
    }
    const total = positive(roll.wastage)
    if (total) lines.push(`Total ${kg(total)}`)
    return lines
  }
  if (column === "lamination") {
    const total = positive(roll.wastage)
    return total ? [kg(total)] : []
  }
  return []
}

function extrusionLines(roll: ProducedRoll) {
  const lines: string[] = []
  const coating = positive(roll.inkGsm)
  const trim = positive(roll.trimWastage)
  const lumps = positive(roll.lumpsWastage)
  const output = positive(roll.eclOutputWastage)
  if (coating) lines.push(`Coating ${kg(coating)}`)
  if (trim) lines.push(`Trim ${kg(trim)}`)
  if (lumps) lines.push(`Lumps ${kg(lumps)}`)
  if (output) lines.push(`Output ${kg(output)}`)
  return lines
}

function inkLines(roll: ProducedRoll) {
  const lines: string[] = []
  const gsm = decimal(roll.inkGsm)
  const byWeight = decimal(roll.inkGsmByInkWt)
  if (gsm != null && positive(roll.inkGsm)) lines.push(`gsm ${gsm}`)
  if (byWeight != null && positive(roll.inkGsmByInkWt)) lines.push(`by ink wt ${byWeight}`)
  return lines
}

function adhesiveLines(roll: ProducedRoll) {
  const lines: string[] = []
  if (positive(roll.adhesiveOh)) lines.push(`OH ${decimal(roll.adhesiveOh)}`)
  if (positive(roll.adhesiveNco)) lines.push(`NCO ${decimal(roll.adhesiveNco)}`)
  if (positive(roll.ohPercent)) lines.push(`OH % ${decimal(roll.ohPercent)}`)
  return lines
}

function rollTitle(roll: ProducedRoll) {
  return roll.barcode || roll.rollno || roll.itemName || `Roll ${roll.id}`
}

function detailLines(itemName: string, title: string, size: number | null, micron: number | null, net: number | null, meter: number | null, jobCard?: string | null) {
  const lines: string[] = []
  if (itemName && itemName !== title) lines.push(itemName)
  const sizeText = sizeLine(size, micron)
  if (sizeText) lines.push(sizeText)
  const weight = weightLine(net, meter)
  if (weight) lines.push(weight)
  if (jobCard) lines.push(jobCard)
  return lines
}

function isBalanceChild(child: ProducedRoll, parentStage: string | null | undefined) {
  const stage = normalizeRollStage(child.stage)
  if (stage === "rm_balance") return true
  const parent = normalizeRollStage(parentStage)
  return Boolean(parent) && stage === parent
}

function buildFlow(
  outputs: ProducedRoll[],
  childrenByParent: Map<number, ProducedRoll[]>,
  skippedOperations: string[] | null | undefined
): { nodes: JsonNode[]; lines: JsonLine[]; columns: string[] } {
  const skipped = new Set(skippedOperations ?? [])
  const outputIds = new Set(outputs.map((roll) => roll.id))
  const nodes = new Map<string, FlowNode>()
  const edges: { from: string; to: string }[] = []
  const edgeKeys = new Set<string>()
  const parentMeta = new Map<number, ParentMeta>()

  const addEdge = (from: string, to: string) => {
    const key = `${from}->${to}`
    if (from === to || edgeKeys.has(key) || !nodes.has(from) || !nodes.has(to)) return
    edgeKeys.add(key)
    edges.push({ from, to })
  }

  const addNode = (node: FlowNode) => {
    nodes.set(node.id, node)
  }

  for (const roll of outputs) {
    const column = columnForStage(roll.stage)
    addNode({
      id: rollNodeId(roll.id),
      kind: "roll",
      column,
      title: rollTitle(roll),
      subtitle: stageLabel(roll.stage),
      lines: detailLines(roll.itemName, rollTitle(roll), roll.size, roll.micron, roll.netweight, roll.meter, roll.jobCardNumber),
      sortKey: roll.id,
      width: MAIN_W,
      height: 0,
    })
    parentMeta.set(roll.id, {
      id: roll.id,
      itemName: roll.itemName || roll.barcode || "",
      size: roll.size,
      micron: roll.micron,
      netweight: roll.netweight,
      meter: roll.meter,
      balanceWeight: roll.balanceWeight,
      stage: roll.stage,
    })
  }

  for (const roll of outputs) {
    for (const parent of parentsOf(roll)) {
      const previous = parentMeta.get(parent.id)
      parentMeta.set(parent.id, {
        id: parent.id,
        itemName: parent.itemName || previous?.itemName || "",
        size: parent.size ?? previous?.size ?? null,
        micron: parent.micron ?? previous?.micron ?? null,
        netweight: parent.netweight ?? previous?.netweight ?? null,
        meter: parent.meter ?? previous?.meter ?? null,
        balanceWeight: parent.balanceWeight ?? previous?.balanceWeight ?? null,
        stage: parent.stage ?? previous?.stage ?? null,
      })
    }
  }

  for (const roll of outputs) {
    for (const parent of parentsOf(roll)) {
      const meta = parentMeta.get(parent.id)
      if (!meta) continue
      const parentId = rollNodeId(parent.id)
      if (!outputIds.has(parent.id) && !nodes.has(parentId)) {
        const title = meta.itemName || `Roll ${meta.id}`
        addNode({
          id: parentId,
          kind: normalizeRollStage(meta.stage) === "rm_balance" ? "balance" : "parent",
          column: columnForStage(meta.stage),
          title,
          subtitle: stageLabel(meta.stage),
          lines: detailLines(meta.itemName, title, meta.size, meta.micron, meta.netweight, meta.meter),
          sortKey: meta.id,
          width: MAIN_W,
          height: 0,
        })
      }
      addEdge(parentId, rollNodeId(roll.id))
    }
  }

  const parentsWithBalanceChild = new Set<number>()
  for (const [parentId, children] of childrenByParent) {
    const meta = parentMeta.get(parentId)
    const parentNode = rollNodeId(parentId)
    if (!nodes.has(parentNode)) continue
    for (const child of children) {
      if (outputIds.has(child.id)) continue
      if (!isBalanceChild(child, meta?.stage)) continue
      parentsWithBalanceChild.add(parentId)
      const childId = rollNodeId(child.id)
      const anchor = nodes.get(parentNode)
      if (!nodes.has(childId)) {
        const title = rollTitle(child)
        addNode({
          id: childId,
          kind: "balance",
          column: anchor?.column ?? "rm",
          anchorId: parentNode,
          title,
          subtitle: "Balance",
          lines: detailLines(child.itemName, title, child.size, child.micron, child.netweight, child.meter),
          sortKey: child.id,
          width: SAT_W,
          height: 0,
        })
      } else {
        const existing = nodes.get(childId)
        if (existing && !existing.anchorId && existing.kind !== "roll") {
          existing.kind = "balance"
          existing.subtitle = "Balance"
          existing.anchorId = parentNode
          existing.column = anchor?.column ?? existing.column
          existing.width = SAT_W
        }
      }
      addEdge(parentNode, childId)
    }
  }

  for (const [parentId, meta] of parentMeta) {
    if (parentsWithBalanceChild.has(parentId)) continue
    const weight = positive(meta.balanceWeight)
    if (!weight) continue
    const parentNode = rollNodeId(parentId)
    const anchor = nodes.get(parentNode)
    if (!anchor) continue
    const id = `balance-weight-${parentId}`
    addNode({
      id,
      kind: "balance",
      column: anchor.column,
      anchorId: parentNode,
      title: "Balance",
      lines: [kg(weight)],
      sortKey: parentId,
      width: SAT_W,
      height: 0,
    })
    addEdge(parentNode, id)
  }

  for (const roll of outputs) {
    const column = columnForStage(roll.stage)
    const id = rollNodeId(roll.id)
    const attach = (nodeId: string, kind: NodeKind, title: string, lines: string[]) => {
      if (lines.length === 0 || !nodes.has(id)) return
      addNode({
        id: nodeId,
        kind,
        column,
        anchorId: id,
        title,
        lines,
        sortKey: roll.id,
        width: SAT_W,
        height: 0,
      })
      if (kind === "wastage") addEdge(id, nodeId)
      else addEdge(nodeId, id)
    }
    if (column === "printing") attach(`ink-${roll.id}`, "ink", "Ink", inkLines(roll))
    if (column === "ecl") attach(`ext-${roll.id}`, "extrusion", "Extrusion", extrusionLines(roll))
    if (column === "lamination") attach(`adh-${roll.id}`, "adhesive", "Adhesive", adhesiveLines(roll))
    if (column !== "ecl") attach(`waste-${roll.id}`, "wastage", "Wastage", wastageLines(column, roll))
  }

  for (const node of nodes.values()) {
    node.height = cardHeight(node.lines.length, Boolean(node.subtitle))
  }

  for (const column of COLUMNS) {
    if (column.id === "rm" || column.id === "printing" || !skipped.has(column.label)) continue
    const hasOutput = [...nodes.values()].some((node) => node.column === column.id && node.kind === "roll")
    if (hasOutput) continue
    for (const node of nodes.values()) {
      if (node.column === column.id) node.column = "rm"
    }
  }

  const visibleColumns = COLUMNS.filter((column) =>
    [...nodes.values()].some((node) => node.column === column.id && !node.anchorId)
  )

  const columnIndex = new Map(visibleColumns.map((column, index) => [column.id, index]))
  const placedY = new Map<string, number>()

  visibleColumns.forEach((column, index) => {
    const anchors = [...nodes.values()]
      .filter((node) => node.column === column.id && !node.anchorId && columnIndex.has(node.column))
      .sort((a, b) => {
        const ay = primaryY(a.id, nodes, edges, placedY, columnIndex)
        const by = primaryY(b.id, nodes, edges, placedY, columnIndex)
        if (ay != null && by != null && ay !== by) return ay - by
        if (ay != null && by == null) return -1
        if (ay == null && by != null) return 1
        return a.sortKey - b.sortKey
      })
    let cursor = PAD
    for (const anchor of anchors) {
      const satellites = [...nodes.values()]
        .filter((node) => node.anchorId === anchor.id)
        .sort((a, b) => a.id.localeCompare(b.id))
      const inputs = satellites.filter((node) => INPUT_KIND.has(node.kind))
      const outputs = satellites.filter((node) => !INPUT_KIND.has(node.kind))
      const stackHeight = (items: FlowNode[]) =>
        items.reduce((sum, node, itemIndex) => sum + node.height + (itemIndex > 0 ? 8 : 0), 0)
      const inputStack = stackHeight(inputs)
      const outputStack = stackHeight(outputs)
      const overhead = inputs.length > 0 ? inputStack + 8 : 0
      const parentY = primaryY(anchor.id, nodes, edges, placedY, columnIndex)
      const minRollY = cursor + overhead
      const rollY = parentY != null && parentY >= minRollY ? parentY : minRollY
      anchor.width = MAIN_W
      const x = PAD + index * PITCH
      anchor.x = x
      anchor.y = rollY
      placedY.set(anchor.id, rollY)
      inputs.forEach((node, itemIndex) => {
        const offset = inputs.slice(0, itemIndex).reduce((sum, item) => sum + item.height + 8, 0)
        node.x = x + (MAIN_W - node.width) / 2
        node.y = rollY - overhead + offset
        placedY.set(node.id, node.y)
      })
      outputs.forEach((node, itemIndex) => {
        const offset = outputs.slice(0, itemIndex).reduce((sum, item) => sum + item.height + 8, 0)
        node.x = x + MAIN_W + 12
        node.y = rollY + offset
        placedY.set(node.id, node.y)
      })
      cursor = rollY + Math.max(anchor.height, outputStack) + ROW_GAP
    }
  })

  const jsonNodes: JsonNode[] = []
  for (const node of nodes.values()) {
    if (node.x == null || node.y == null) continue
    jsonNodes.push({
      id: node.id,
      text: node.title,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      fixed: true,
      disableDrag: true,
      nodeShape: RGNodeShape.rect,
      color: "transparent",
      borderWidth: 0,
      data: {
        kind: node.kind,
        title: node.title,
        subtitle: node.subtitle,
        lines: node.lines,
      } satisfies CardPayload,
    })
  }

  const kindById = new Map([...nodes.values()].map((node) => [node.id, node.kind]))
  const jsonLines: JsonLine[] = edges
    .filter((edge) => jsonNodes.some((node) => node.id === edge.from) && jsonNodes.some((node) => node.id === edge.to))
    .map((edge) => {
      const source = kindById.get(edge.from)
      const target = kindById.get(edge.to)
      return {
        id: `${edge.from}__${edge.to}`,
        from: edge.from,
        to: edge.to,
        color: (source && SATELLITE_COLOR[source]) || (target && SATELLITE_COLOR[target]) || "#94a3b8",
        lineShape: RGLineShape.StandardCurve,
        showEndArrow: true,
      }
    })

  return {
    nodes: jsonNodes,
    lines: jsonLines,
    columns: visibleColumns.map((column) => column.label),
  }
}

function primaryY(
  nodeId: string,
  nodes: Map<string, FlowNode>,
  edges: { from: string; to: string }[],
  placedY: Map<string, number>,
  columnIndex: Map<ColumnId, number>
) {
  const node = nodes.get(nodeId)
  if (!node) return undefined
  const nodeColumn = columnIndex.get(node.column) ?? 0
  let best: { distance: number; y: number } | undefined
  for (const edge of edges) {
    if (edge.to !== nodeId) continue
    const parent = nodes.get(edge.from)
    if (!parent || parent.anchorId) continue
    const y = placedY.get(parent.id)
    if (y == null) continue
    const parentColumn = columnIndex.get(parent.column) ?? -1
    if (parentColumn >= nodeColumn) continue
    const distance = nodeColumn - parentColumn
    if (!best || distance < best.distance) best = { distance, y }
  }
  return best?.y
}

function FlowCard({ node }: RGNodeSlotProps) {
  const data = (node.data ?? {}) as CardPayload
  const kind = data.kind ?? "roll"
  return (
    <div
      className={cn(
        "box-border flex h-full w-full flex-col overflow-hidden rounded-md border px-2 py-1.5 text-left shadow-sm",
        KIND_CLASS[kind]
      )}
      style={{ width: node.width, height: node.height }}
    >
      <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{data.title || node.text}</p>
      {data.subtitle && (
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {data.subtitle}
        </p>
      )}
      {data.lines?.map((line) => (
        <p key={line} className="truncate text-[11px] text-slate-700 dark:text-slate-300">
          {line}
        </p>
      ))}
    </div>
  )
}

function bindGraphSurface(host: HTMLElement, graphInstance: ReturnType<typeof RGHooks.useGraphInstance>) {
  const surface = host.querySelector(".relation-graph")
  if (surface instanceof HTMLElement) graphInstance.setDom(surface)
}

function FlowCanvas({
  nodes,
  lines,
}: {
  nodes: JsonNode[]
  lines: JsonLine[]
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const graphInstance = RGHooks.useGraphInstance()
  const signature = useMemo(
    () => `${nodes.map((node) => `${node.id}:${node.x}:${node.y}`).join("|")}::${lines.map((line) => line.id).join("|")}`,
    [nodes, lines]
  )

  useEffect(() => {
    if (nodes.length === 0) return
    let cancelled = false
    const run = async () => {
      const data = { rootId: nodes[0]?.id, nodes, lines }
      try {
        await graphInstance.setJsonData(data)
      } catch {
        await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
        if (cancelled) return
        await graphInstance.setJsonData(data)
      }
      if (cancelled) return
      const fit = (attempt = 0) => {
        if (cancelled || attempt > 8) return
        const box = document.querySelector(".wo-flow-graph")
        if (!box || box.clientWidth < 100) {
          window.setTimeout(() => fit(attempt + 1), 200)
          return
        }
        const host = hostRef.current
        const surface = host?.querySelector(".relation-graph") ?? box.querySelector(".relation-graph")
        if (surface instanceof HTMLElement) graphInstance.setDom(surface)
        try {
          graphInstance.updateOptions({
            viewSize: { width: box.clientWidth, height: box.clientHeight },
          })
          graphInstance.zoomToFit()
        } catch {
          // The graph stays pannable if the first fit runs before the canvas is measured.
        }
      }
      window.setTimeout(() => fit(), 200)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [graphInstance, signature, nodes, lines])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      bindGraphSurface(host, graphInstance)
      const step = Math.max(-20, Math.min(20, -event.deltaY / 8))
      if (step === 0) return
      try {
        graphInstance.zoom(step, { x: event.clientX, y: event.clientY })
      } catch {
        // Ignore a zoom that runs before the canvas has a size.
      }
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      bindGraphSurface(host, graphInstance)
      host.setPointerCapture(event.pointerId)
      let lastX = event.clientX
      let lastY = event.clientY
      const onPointerMove = (move: PointerEvent) => {
        const dx = move.clientX - lastX
        const dy = move.clientY - lastY
        lastX = move.clientX
        lastY = move.clientY
        if (dx === 0 && dy === 0) return
        graphInstance.scrollView(dx, dy)
      }
      const onPointerUp = (up: PointerEvent) => {
        host.removeEventListener("pointermove", onPointerMove)
        host.removeEventListener("pointerup", onPointerUp)
        host.removeEventListener("pointercancel", onPointerUp)
        if (host.hasPointerCapture(up.pointerId)) host.releasePointerCapture(up.pointerId)
      }
      host.addEventListener("pointermove", onPointerMove)
      host.addEventListener("pointerup", onPointerUp)
      host.addEventListener("pointercancel", onPointerUp)
    }
    host.addEventListener("wheel", onWheel, { passive: false })
    host.addEventListener("pointerdown", onPointerDown)
    return () => {
      host.removeEventListener("wheel", onWheel)
      host.removeEventListener("pointerdown", onPointerDown)
    }
  }, [graphInstance])

  return (
    <div ref={hostRef} className="h-full w-full cursor-grab touch-none active:cursor-grabbing">
      <RelationGraph options={GRAPH_OPTIONS}>
        <RGSlotOnNode>{(props) => <FlowCard {...props} />}</RGSlotOnNode>
      </RelationGraph>
    </div>
  )
}

type WorkOrderRelationshipGraphProps = {
  rollsByStage: Record<string, ProducedRoll[]>
  skippedOperations?: string[] | null
  loading?: boolean
}

export function WorkOrderRelationshipGraph({
  rollsByStage,
  skippedOperations,
  loading = false,
}: WorkOrderRelationshipGraphProps) {
  const outputs = useMemo(() => {
    const map = new Map<number, ProducedRoll>()
    for (const [stage, rows] of Object.entries(rollsByStage)) {
      for (const row of rows) map.set(row.id, { ...row, stage: row.stage || stage })
    }
    return [...map.values()]
  }, [rollsByStage])

  const parentKey = useMemo(() => collectParentIds(outputs).join(","), [outputs])
  const [childrenByParent, setChildrenByParent] = useState<Map<number, ProducedRoll[]>>(new Map())
  const [balanceLoading, setBalanceLoading] = useState(false)

  useEffect(() => {
    const ids = parentKey ? parentKey.split(",").map((id) => Number(id)).filter((id) => Number.isFinite(id)) : []
    if (ids.length === 0) {
      setChildrenByParent(new Map())
      setBalanceLoading(false)
      return
    }
    let cancelled = false
    setBalanceLoading(true)
    Promise.all(
      ids.map(async (id) => {
        try {
          const rows = await getRollsStockByParentIds([id])
          return [id, rows] as const
        } catch {
          return [id, [] as ProducedRoll[]] as const
        }
      })
    ).then((entries) => {
      if (cancelled) return
      setChildrenByParent(new Map(entries))
      setBalanceLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [parentKey])

  const model = useMemo(
    () => buildFlow(outputs, childrenByParent, skippedOperations),
    [outputs, childrenByParent, skippedOperations]
  )

  if (loading && outputs.length === 0) {
    return <p className="px-1 text-sm text-muted-foreground">Loading rolls…</p>
  }
  if (outputs.length === 0) {
    return <p className="px-1 text-sm text-muted-foreground">No rolls to relate.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-muted-foreground">{model.columns.join(" → ")}</p>
        <p className="text-xs text-muted-foreground">
          {balanceLoading ? "Loading balance rolls…" : "Drag to move · scroll to zoom"}
        </p>
      </div>
      <div className="wo-flow-graph h-[70vh] min-h-[520px] overflow-hidden rounded-lg border bg-white dark:bg-slate-950">
        <style>{`
          .wo-flow-graph .rg-node {
            padding: 0;
            background: transparent;
            border: none;
            box-shadow: none;
          }
          .wo-flow-graph .relation-graph,
          .wo-flow-graph .rg-map,
          .wo-flow-graph .rg-node,
          .wo-flow-graph .rg-node-peel,
          .wo-flow-graph svg {
            pointer-events: none;
          }
          .wo-flow-graph .rg-toolbar {
            display: none;
          }
        `}</style>
        <RGProvider>
          <FlowCanvas nodes={model.nodes} lines={model.lines} />
        </RGProvider>
      </div>
    </div>
  )
}
