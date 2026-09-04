import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Printer,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useSidebar } from "@/components/ui/sidebar"
import { ColumnHeader } from "@/components/column-header"
import { getRollsStockColumns, includesStringFilterFn, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import {
  addEclRoll,
  addInspectionRoll,
  addLaminationRoll,
  addPrintedRoll,
  addSlittingRoll,
  createJobCard,
  getAllJobCards,
  getCurrentRoll,
  getLoadedRolls,
  scanRoll,
  unloadRoll,
  type CurrentRoll,
} from "@/lib/job-card-api"
import { getAllWorkOrders, skipWorkOrderOperation, updateWorkOrder } from "@/lib/work-order-api"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import {
  allowedWipStagesForDept,
  isAllowedWipStage,
  isOperationSkipped,
  wipStageLabel,
  type FloorSkipOperation,
} from "@/lib/wo-flow"
import {
  getRollsStockById,
  updateRollsStock,
  getRollsStockByParentIds,
  getRollsStockByWorkOrder,
  getRollByBarcode,
  getWorkOrderByRollBarcode,
  getAllRollsStock,
} from "@/lib/rolls-stock-api"
import { getAllMachines } from "@/lib/machine-api"
import { getAllOperators } from "@/lib/operator-api"
import { getAllTemplates, type TemplateMaster } from "@/lib/template-api"
import { createPrintJob, getPrintJob } from "@/lib/print-job-api"
import { formatWeightWithMeter } from "@/lib/film-calc"
import { FloorDepartmentGrid } from "./home/components/FloorDepartmentGrid"
import { FloorShell } from "./home/components/FloorShell"
import { GeneralDashboard } from "./home/components/GeneralDashboard"
import { StockDashboard } from "./home/components/StockDashboard"
import { floorDepartmentBlocks, type FloorDepartmentId } from "./home/constants"
import { EclPanel } from "./home/floor/ecl/EclPanel"
import { InspectionPanel } from "./home/floor/inspection/InspectionPanel"
import { LaminationPanel } from "./home/floor/lamination/LaminationPanel"
import { PrintingPanel } from "./home/floor/printing/PrintingPanel"
import { SlittingPanel } from "./home/floor/slitting/SlittingPanel"
import { usePrinterStatus } from "./home/hooks/usePrinterStatus"
import { useRoleFlags } from "./home/hooks/useRoleFlags"
import { useScaleConnection } from "./home/hooks/useScaleConnection"
import WorkOrder from "./work-order"

function isRmFilmStage(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
  return s === "virgin_rm" || s === "rm_balance"
}

function rmFilmStageLabel(stage: string | null | undefined) {
  const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
  if (s === "rm_balance") return "RM Balance"
  if (s === "virgin_rm") return "RM Virgin"
  return stage || "—"
}

async function fetchAvailableRmFilmRolls() {
  const results = await Promise.allSettled([
    getAllRollsStock(0, 500, false, "virgin_rm"),
    getAllRollsStock(0, 500, false, "rm_balance"),
  ])
  const rolls = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  return rolls.filter((r) => !r.consumed && !r.issued)
}

async function fetchAvailableWipRolls(stages: string[]) {
  const unique = [...new Set(stages)]
  const results = await Promise.allSettled(
    unique.map((stage) => getAllRollsStock(0, 500, false, stage))
  )
  const rolls = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []))
  return rolls.filter((r) => !r.consumed && !r.issued)
}

async function workOrderStagesFromAvailableRolls(
  stages: string[],
  isCancelled: () => boolean
): Promise<Map<number, Set<string>>> {
  const byWo = new Map<number, Set<string>>()
  const BATCH = 15
  for (const stage of stages) {
    const rolls = await getAllRollsStock(0, 500, false, stage)
    for (let i = 0; i < rolls.length; i += BATCH) {
      if (isCancelled()) return byWo
      const batch = rolls.slice(i, i + BATCH)
      const results = await Promise.all(
        batch.map(async (roll) => {
          try {
            if (roll.consumed) return null
            const barcode = roll.barcode?.trim()
            if (!barcode) return null
            const woInfo = await getWorkOrderByRollBarcode(barcode)
            if (woInfo?.workOrderId == null) return null
            return { workOrderId: woInfo.workOrderId as number, stage }
          } catch {
            return null
          }
        })
      )
      results.forEach((row) => {
        if (!row) return
        const set = byWo.get(row.workOrderId) ?? new Set<string>()
        set.add(row.stage)
        byWo.set(row.workOrderId, set)
      })
    }
  }
  return byWo
}

function filterDepartmentWorkOrders(
  allWos: WorkOrderMaster[],
  operation: FloorSkipOperation,
  stagesByWo: Map<number, Set<string>>,
  loadedWorkOrderIds: Set<number>
): WorkOrderMaster[] {
  return allWos.filter((wo) => {
    if (wo.status === "completed" || wo.status === "cancelled") return false
    if (isOperationSkipped(wo.skippedOperations, operation)) return false
    if (loadedWorkOrderIds.has(wo.id)) return true
    const allowed = allowedWipStagesForDept(operation, wo.skippedOperations)
    const have = stagesByWo.get(wo.id)
    return allowed.some((stage) => have?.has(stage))
  })
}

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state: sidebarState, isMobile } = useSidebar()
  const { isStockUser, isPrintingUser, isFloorUser } = useRoleFlags(user)
  const { printerName, printerAvailable, websocketConnected } = usePrinterStatus(isFloorUser)
  const {
    scaleWeight,
    scaleWeightError,
    isSerialSupported,
    isScaleConnecting,
    isScaleConnected,
    connectScale,
  } = useScaleConnection()
  const [floorView, setFloorView] = useState<FloorDepartmentId | null>(null)
  const [printingWorkOrders, setPrintingWorkOrders] = useState<WorkOrderMaster[]>([])
  const [printingLoading, setPrintingLoading] = useState(false)
  const [printingError, setPrintingError] = useState<string | null>(null)
  const [printingSelectedWo, setPrintingSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [printingRollsRefreshKey, setPrintingRollsRefreshKey] = useState(0)
  const [printingRollsLoading, setPrintingRollsLoading] = useState(false)
  const [printingLoadedRolls, setPrintingLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
  >([])
  const [printingCreateChildLoading, setPrintingCreateChildLoading] = useState(false)
  const [printingCreateChildMessage, setPrintingCreateChildMessage] = useState<string | null>(null)
  const [printingAddRollForm, setPrintingAddRollForm] = useState<{
    jobCardNumber: string
    jobCardId: number
    roll: CurrentRoll
    parent: { gradeId?: number; density?: number | null }
    size: string
    micron: string
    netweight: string
    meter: string
    grossweight: string
    wastage: string
    plainWastage: string
    printedWastage: string
    inkGsm: string
    balanceweight: string
  } | null>(null)
  const [, setPrintingAddRollEditingField] = useState<
    null | "netweight" | "grossweight"
  >(null)
  const [printingFormCommittedForRollId, setPrintingFormCommittedForRollId] = useState<number | null>(null)
  const [printingChildRollsFromDb, setPrintingChildRollsFromDb] = useState<
    Awaited<ReturnType<typeof getRollsStockByParentIds>>
  >([])
  const [printingChildRollsLoading, setPrintingChildRollsLoading] = useState(false)
  const [wipPrintingTemplate, setWipPrintingTemplate] = useState<TemplateMaster | null>(null)
  const [printingPrintStatus, setPrintingPrintStatus] = useState<"idle" | "printing" | "done">("idle")
  const [floorPrintingBarcode, setFloorPrintingBarcode] = useState("")
  const [floorPrintingBarcodeError, setFloorPrintingBarcodeError] = useState<string | null>(null)
  const [floorPrintingBarcodeChecking, setFloorPrintingBarcodeChecking] = useState(false)
  const [floorPrintingRmPickerOpen, setFloorPrintingRmPickerOpen] = useState(false)
  const [floorPrintingRmRolls, setFloorPrintingRmRolls] = useState<RollsStockRow[]>([])
  const [floorPrintingRmRollsLoading, setFloorPrintingRmRollsLoading] = useState(false)
  const [floorPrintingRmRollsError, setFloorPrintingRmRollsError] = useState<string | null>(null)

  const floorPrintingRmStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "rm" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Warehouse" column={column} placeholder="Filter warehouse..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{rmFilmStageLabel(row.original.stage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  // Floor Inspection (mirror of Floor Printing)
  const [inspectionWorkOrders, setInspectionWorkOrders] = useState<WorkOrderMaster[]>([])
  const [inspectionLoading, setInspectionLoading] = useState(false)
  const [inspectionError, setInspectionError] = useState<string | null>(null)
  const [inspectionSelectedWo, setInspectionSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [inspectionRollsRefreshKey, setInspectionRollsRefreshKey] = useState(0)
  const [inspectionRollsLoading, setInspectionRollsLoading] = useState(false)
  const [inspectionLoadedRolls, setInspectionLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll; operatorName?: string; shift?: string }[]
  >([])
  const [inspectionCreateChildLoading, setInspectionCreateChildLoading] = useState(false)
  const [inspectionCreateChildMessage, setInspectionCreateChildMessage] = useState<string | null>(null)
  const [inspectionAddRollForm, setInspectionAddRollForm] = useState<{
    jobCardNumber: string
    jobCardId: number
    roll: CurrentRoll
    parent: { gradeId?: number }
    size: string
    micron: string
    netweight: string
    wastage: string
    wastageReason: string
    noOfTag: string
    noOfCuts: string
    operatorName: string
    shift: string
    remark: string
    balanceweight: string
  } | null>(null)
  const [inspectionAddRollEditingField, setInspectionAddRollEditingField] = useState<
    null | "netweight" | "grossweight"
  >(null)
  const [inspectionFormCommittedForRollId, setInspectionFormCommittedForRollId] = useState<number | null>(null)
  const [inspectionChildRollsFromDb, setInspectionChildRollsFromDb] = useState<
    Awaited<ReturnType<typeof getRollsStockByParentIds>>
  >([])
  const [inspectionChildRollsLoading, setInspectionChildRollsLoading] = useState(false)
  /** Floor Inspection list: scan roll barcode to open that work order (same role/dept as floor dashboard). */
  const [floorInspectionBarcode, setFloorInspectionBarcode] = useState("")
  const [floorInspectionBarcodeError, setFloorInspectionBarcodeError] = useState<string | null>(null)
  const [floorInspectionBarcodeChecking, setFloorInspectionBarcodeChecking] = useState(false)
  const [floorInspectionWipPickerOpen, setFloorInspectionWipPickerOpen] = useState(false)
  const [floorInspectionWipRolls, setFloorInspectionWipRolls] = useState<RollsStockRow[]>([])
  const [floorInspectionWipRollsLoading, setFloorInspectionWipRollsLoading] = useState(false)
  const [floorInspectionWipRollsError, setFloorInspectionWipRollsError] = useState<string | null>(null)

  const floorInspectionWipStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "wip" }),
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const handlePrintingProducedRollReprint = async (r: any) => {
    const wo = printingSelectedWo
    if (!wo || !wipPrintingTemplate) return
    try {
      setPrintingCreateChildLoading(true)
      const printData = {
        workOrder: {
          id: wo.id,
          woNumber: wo.woNumber,
          partyName: wo.partyName,
          partyCode: wo.partyCode,
          itemName: wo.itemName,
          itemCode: wo.itemCode,
          plannedQty: wo.plannedQty,
          producedQty: wo.producedQty,
          status: wo.status,
          priority: wo.priority,
          createdAt: wo.createdAt,
          startedAt: wo.startedAt,
          completedAt: wo.completedAt,
        },
        roll: {
          id: r.id,
          barcode: r.barcode,
          size: r.size,
          micron: r.micron,
          netweight: r.netweight,
          meter: r.meter,
          grossweight: r.grossweight,
          inkGsm: r.inkGsm,
          inkGsmByInkWt: r.inkGsmByInkWt,
          itemName: wo.itemName ?? r.itemName ?? null,
        },
      }
      const job = await createPrintJob({
        name: `WIP Printing Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
        template_id: wipPrintingTemplate.id,
        data: printData,
        copies: 1,
      })
      setPrintingCreateChildMessage("Label reprint sent to printer.")
      setPrintingPrintStatus("printing")
      let pollCount = 0
      const maxPolls = 30
      const pollInterval = setInterval(async () => {
        pollCount++
        try {
          const updatedJob = await getPrintJob(job.id)
          if (updatedJob.status === "done") {
            clearInterval(pollInterval)
            setPrintingPrintStatus("done")
            setTimeout(() => setPrintingPrintStatus("idle"), 3000)
          } else if (updatedJob.status === "failed" || pollCount >= maxPolls) {
            clearInterval(pollInterval)
            setPrintingPrintStatus("idle")
          }
        } catch {
          clearInterval(pollInterval)
          setPrintingPrintStatus("idle")
        }
      }, 1000)
    } catch {
      setPrintingCreateChildMessage("Failed to send reprint to printer.")
    } finally {
      setPrintingCreateChildLoading(false)
    }
  }

  const printingProducedRollColumns = [
      {
        id: "sno",
        header: () => <div>S. no.</div>,
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.index + 1}</div>
        ),
      },
      {
        accessorKey: "jobCardNumber",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Loaded job card" column={column} placeholder="Filter job card..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.jobCardNumber || "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "size",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.size != null ? String(row.original.size) : "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "micron",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.micron != null ? String(row.original.micron) : "-"}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "parentNetweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Input weight (kg)" column={column} placeholder="Filter input weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {formatWeightWithMeter(row.original.parentNetweight, row.original.parentMeter)}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Output weight (kg)" column={column} placeholder="Filter output weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "meter",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Meter" column={column} placeholder="Filter meter..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.meter != null && Number(row.original.meter) > 0
              ? Math.round(Number(row.original.meter))
              : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "plainWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Plain wastage (kg)" column={column} placeholder="Filter plain wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.plainWastage != null ? `${Number(row.original.plainWastage).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "printedWastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Printed wastage (kg)" column={column} placeholder="Filter printed wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.printedWastage != null ? `${Number(row.original.printedWastage).toFixed(2)} kg` : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "inkGsm",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Ink gsm" column={column} placeholder="Filter ink gsm..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.inkGsm != null ? String(row.original.inkGsm) : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "inkGsmByInkWt",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Ink gsm (by ink wt)" column={column} placeholder="Filter ink gsm by ink wt..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.inkGsmByInkWt != null ? String(row.original.inkGsmByInkWt) : "-"}
          </div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "balanceWeight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Balance weight (kg)" column={column} placeholder="Filter balance weight..." />
        ),
        cell: ({ row }: { row: any }) => {
          const value = row.original.parentBalanceWeight ?? row.original.balanceWeight
          return (
            <div className="text-sm">
              {value != null ? `${Number(value).toFixed(2)} kg` : "-"}
            </div>
          )
        },
        filterFn: includesStringFilterFn,
      },
      {
        id: "reprint",
        header: () => <div className="text-left">Reprint</div>,
        cell: ({ row }: { row: any }) => (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!wipPrintingTemplate || printingCreateChildLoading}
              onClick={() => handlePrintingProducedRollReprint(row.original)}
            >
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ]

  const printingProducedTotals = useMemo(() => {
    return printingChildRollsFromDb.reduce(
      (acc, row) => {
        acc.rollCount += 1
        acc.netWeight += Number(row.netweight || 0)
        acc.plainWastage += Number(row.plainWastage || 0)
        acc.printedWastage += Number(row.printedWastage || 0)
        return acc
      },
      { rollCount: 0, netWeight: 0, plainWastage: 0, printedWastage: 0 }
    )
  }, [printingChildRollsFromDb])

  // Floor ECL (mirror of Inspection)
  const [eclWorkOrders, setEclWorkOrders] = useState<WorkOrderMaster[]>([])
  const [eclLoading, setEclLoading] = useState(false)
  const [eclError, setEclError] = useState<string | null>(null)
  const [eclSelectedWo, setEclSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [eclRollsLoading, setEclRollsLoading] = useState(false)
  const [eclLoadedRolls, setEclLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
  >([])
  const [eclCreateChildLoading, setEclCreateChildLoading] = useState(false)
  const [eclCreateChildMessage, setEclCreateChildMessage] = useState<string | null>(null)
  const [eclAddRollForm, setEclAddRollForm] = useState<{
    jobCardNumber: string
    jobCardId: number
    roll: CurrentRoll
    parent: { gradeId?: number }
    size: string
    micron: string
    netweight: string
    grossweight: string
  } | null>(null)
  const [eclFormCommittedForRollId, setEclFormCommittedForRollId] = useState<number | null>(null)
  const [eclRollsRefreshKey, setEclRollsRefreshKey] = useState(0)
  const [eclAddRollEditingField, setEclAddRollEditingField] = useState<
    null | "netweight" | "grossweight"
  >(null)
  const [eclChildRollsFromDb, setEclChildRollsFromDb] = useState<
    Awaited<ReturnType<typeof getRollsStockByParentIds>>
  >([])
  const [eclChildRollsLoading, setEclChildRollsLoading] = useState(false)
  const [floorEclBarcode, setFloorEclBarcode] = useState("")
  const [floorEclBarcodeError, setFloorEclBarcodeError] = useState<string | null>(null)
  const [floorEclBarcodeChecking, setFloorEclBarcodeChecking] = useState(false)
  const [floorEclWipPickerOpen, setFloorEclWipPickerOpen] = useState(false)
  const [floorEclWipRolls, setFloorEclWipRolls] = useState<RollsStockRow[]>([])
  const [floorEclWipRollsLoading, setFloorEclWipRollsLoading] = useState(false)
  const [floorEclWipRollsError, setFloorEclWipRollsError] = useState<string | null>(null)
  const [floorEclRmPickerOpen, setFloorEclRmPickerOpen] = useState(false)
  const [floorEclRmRolls, setFloorEclRmRolls] = useState<RollsStockRow[]>([])
  const [floorEclRmRollsLoading, setFloorEclRmRollsLoading] = useState(false)
  const [floorEclRmRollsError, setFloorEclRmRollsError] = useState<string | null>(null)
  const [floorEclDetailWipBarcode, setFloorEclDetailWipBarcode] = useState("")
  const [floorEclDetailRmBarcode, setFloorEclDetailRmBarcode] = useState("")

  const floorEclWipStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "wip" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Stage" column={column} placeholder="Filter stage..." />
        ),
        cell: ({ row }: { row: any }) => {
          const stage = (row.original.stage ?? "").toLowerCase()
          if (stage === "wip_printed" || stage === "wip-printing") return "WIP Printing"
          if (stage === "wip_inspection" || stage === "wip-inspection") return "WIP Inspection"
          return row.original.stage || "—"
        },
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const floorEclRmStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "rm" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Warehouse" column={column} placeholder="Filter warehouse..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{rmFilmStageLabel(row.original.stage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const isEclWipParentStage = (stage: string | null | undefined) => {
    const s = (stage ?? "").toLowerCase()
    return (
      s === "wip_printed" ||
      s === "wip-printing" ||
      s === "wip_inspection" ||
      s === "wip-inspection"
    )
  }

  const isEclRmParentStage = (stage: string | null | undefined) => isRmFilmStage(stage)

  const getEclParentRole = (stage: string | null | undefined): "wip" | "rm" | null => {
    if (isEclWipParentStage(stage)) return "wip"
    if (isEclRmParentStage(stage)) return "rm"
    return null
  }

  // Floor Lamination (mirror of ECL dual-parent)
  const [laminationWorkOrders, setLaminationWorkOrders] = useState<WorkOrderMaster[]>([])
  const [laminationLoading, setLaminationLoading] = useState(false)
  const [laminationError, setLaminationError] = useState<string | null>(null)
  const [laminationSelectedWo, setLaminationSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [laminationRollsLoading, setLaminationRollsLoading] = useState(false)
  const [laminationLoadedRolls, setLaminationLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
  >([])
  const [laminationCreateChildLoading, setLaminationCreateChildLoading] = useState(false)
  const [laminationCreateChildMessage, setLaminationCreateChildMessage] = useState<string | null>(null)
  const [laminationAddRollForm, setLaminationAddRollForm] = useState<{
    jobCardNumber: string
    jobCardId: number
    roll: CurrentRoll
    parent: { gradeId?: number }
    size: string
    micron: string
    netweight: string
    grossweight: string
  } | null>(null)
  const [laminationFormCommittedForRollId, setLaminationFormCommittedForRollId] = useState<number | null>(null)
  const [laminationRollsRefreshKey, setLaminationRollsRefreshKey] = useState(0)
  const [laminationAddRollEditingField, setLaminationAddRollEditingField] = useState<
    null | "netweight" | "grossweight"
  >(null)
  const [laminationChildRollsFromDb, setLaminationChildRollsFromDb] = useState<
    Awaited<ReturnType<typeof getRollsStockByParentIds>>
  >([])
  const [laminationChildRollsLoading, setLaminationChildRollsLoading] = useState(false)
  const [floorLaminationBarcode, setFloorLaminationBarcode] = useState("")
  const [floorLaminationBarcodeError, setFloorLaminationBarcodeError] = useState<string | null>(null)
  const [floorLaminationBarcodeChecking, setFloorLaminationBarcodeChecking] = useState(false)
  const [floorLaminationWipPickerOpen, setFloorLaminationWipPickerOpen] = useState(false)
  const [floorLaminationWipRolls, setFloorLaminationWipRolls] = useState<RollsStockRow[]>([])
  const [floorLaminationWipRollsLoading, setFloorLaminationWipRollsLoading] = useState(false)
  const [floorLaminationWipRollsError, setFloorLaminationWipRollsError] = useState<string | null>(null)
  const [floorLaminationRmPickerOpen, setFloorLaminationRmPickerOpen] = useState(false)
  const [floorLaminationRmRolls, setFloorLaminationRmRolls] = useState<RollsStockRow[]>([])
  const [floorLaminationRmRollsLoading, setFloorLaminationRmRollsLoading] = useState(false)
  const [floorLaminationRmRollsError, setFloorLaminationRmRollsError] = useState<string | null>(null)
  const [floorLaminationDetailWipBarcode, setFloorLaminationDetailWipBarcode] = useState("")
  const [floorLaminationDetailRmBarcode, setFloorLaminationDetailRmBarcode] = useState("")

  const floorLaminationWipStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "wip" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Stage" column={column} placeholder="Filter stage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{wipStageLabel(row.original.stage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const floorLaminationRmStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "rm" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Warehouse" column={column} placeholder="Filter warehouse..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{rmFilmStageLabel(row.original.stage)}</div>
        ),
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const isLaminationWipParentStage = (stage: string | null | undefined) => {
    const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
    return (
      s === "wip_ecl" ||
      s === "wip_inspection" ||
      s === "wip_printed"
    )
  }

  const isLaminationRmParentStage = (stage: string | null | undefined) => isRmFilmStage(stage)

  const getLaminationParentRole = (stage: string | null | undefined): "wip" | "rm" | null => {
    if (isLaminationWipParentStage(stage)) return "wip"
    if (isLaminationRmParentStage(stage)) return "rm"
    return null
  }

  // Floor Slitting (one parent → many finished-goods children)
  const [slittingWorkOrders, setSlittingWorkOrders] = useState<WorkOrderMaster[]>([])
  const [slittingLoading, setSlittingLoading] = useState(false)
  const [slittingError, setSlittingError] = useState<string | null>(null)
  const [slittingSelectedWo, setSlittingSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [slittingRollsLoading, setSlittingRollsLoading] = useState(false)
  const [slittingLoadedRolls, setSlittingLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
  >([])
  const [slittingCreateChildLoading, setSlittingCreateChildLoading] = useState(false)
  const [slittingCreateChildMessage, setSlittingCreateChildMessage] = useState<string | null>(null)
  const [slittingAddRollForm, setSlittingAddRollForm] = useState<{
    jobCardNumber: string
    jobCardId: number
    roll: CurrentRoll
    parent: { gradeId?: number }
    size: string
    micron: string
    netweight: string
    grossweight: string
  } | null>(null)
  const [slittingRollsRefreshKey, setSlittingRollsRefreshKey] = useState(0)
  const [slittingAddRollEditingField, setSlittingAddRollEditingField] = useState<
    null | "netweight" | "grossweight"
  >(null)
  const [slittingChildRollsFromDb, setSlittingChildRollsFromDb] = useState<
    Awaited<ReturnType<typeof getRollsStockByParentIds>>
  >([])
  const [slittingChildRollsLoading, setSlittingChildRollsLoading] = useState(false)
  const [floorSlittingBarcode, setFloorSlittingBarcode] = useState("")
  const [floorSlittingBarcodeError, setFloorSlittingBarcodeError] = useState<string | null>(null)
  const [floorSlittingBarcodeChecking, setFloorSlittingBarcodeChecking] = useState(false)
  const [floorSlittingParentPickerOpen, setFloorSlittingParentPickerOpen] = useState(false)
  const [floorSlittingParentRolls, setFloorSlittingParentRolls] = useState<RollsStockRow[]>([])
  const [floorSlittingParentRollsLoading, setFloorSlittingParentRollsLoading] = useState(false)
  const [floorSlittingParentRollsError, setFloorSlittingParentRollsError] = useState<string | null>(null)

  const floorSlittingParentStockColumns = useMemo(
    () => [
      ...getRollsStockColumns({ variant: "wip" }),
      {
        accessorKey: "stage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Stage" column={column} placeholder="Filter stage..." />
        ),
        cell: ({ row }: { row: any }) => {
          const stage = (row.original.stage ?? "").toLowerCase()
          if (stage === "wip_printed" || stage === "wip-printing") return "WIP Printing"
          if (stage === "wip_inspection" || stage === "wip-inspection") return "WIP Inspection"
          if (stage === "wip_ecl" || stage === "wip-ecl") return "WIP ECL"
          if (stage === "wip_lamination" || stage === "wip-lamination") return "WIP Lamination"
          return row.original.stage || "—"
        },
        filterFn: includesStringFilterFn,
      },
      {
        accessorKey: "barcode",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Barcode" column={column} placeholder="Filter barcode..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm font-mono">{row.original.barcode || "-"}</div>
        ),
      },
    ],
    []
  )

  const isSlittingParentStage = (stage: string | null | undefined) => {
    const s = (stage ?? "").toLowerCase().replace(/-/g, "_")
    return (
      s === "wip_printed" ||
      s === "wip_inspection" ||
      s === "wip_ecl" ||
      s === "wip_lamination"
    )
  }

  const closeFloorInspectionWipPicker = () => {
    setFloorInspectionWipPickerOpen(false)
    setFloorInspectionWipRollsError(null)
    setFloorInspectionWipRolls([])
  }

  const applyFloorInspectionFromBarcode = async (
    barcodeRaw: string,
    options?: { closePicker?: boolean }
  ) => {
    const barcode = barcodeRaw.trim()
    const wo = inspectionSelectedWo
    if (!wo) return
    if (!barcode) {
      setFloorInspectionBarcodeError("Scan or enter a roll barcode first.")
      return
    }
    setFloorInspectionBarcodeError(null)
    setFloorInspectionBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorInspectionBarcodeError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setFloorInspectionBarcodeError("This roll is already consumed.")
        return
      }
      const stage = (roll.stage ?? "").toLowerCase()
      const isWipPrinting = stage === "wip_printed" || stage === "wip-printing"
      if (!isWipPrinting) {
        setFloorInspectionBarcodeError(
          `Roll must be in WIP Printing stage. Current stage: ${roll.stage || "—"}`
        )
        return
      }
      const woInfo = await getWorkOrderByRollBarcode(barcode)
      if (!woInfo) {
        setFloorInspectionBarcodeError(
          "No work order linked to this roll (roll must come from a production job card)."
        )
        return
      }
      if (woInfo.workOrderId !== wo.id) {
        setFloorInspectionBarcodeError("This roll belongs to a different work order.")
        return
      }
      if (isOperationSkipped(wo.skippedOperations, "Inspection")) {
        setFloorInspectionBarcodeError("Inspection was skipped for this work order.")
        return
      }

      // Find an Inspection job card to load onto (prefer one with no current roll).
      const cards = await getAllJobCards(0, 50, wo.id, "Inspection")
      let targetCardId: number | null = null
      for (const card of cards) {
        try {
          const current = await getCurrentRoll(card.id)
          if (!current) {
            targetCardId = card.id
            break
          }
        } catch {
          // ignore and try next card
        }
      }
      if (targetCardId == null && cards.length > 0) {
        targetCardId = cards[0].id
      }

      // No Inspection job card yet — create one, then load the roll (same as Work Order scan flow).
      if (targetCardId == null) {
        const [operatorsList, machinesList] = await Promise.all([
          getAllOperators(0, 500),
          getAllMachines(0, 500),
        ])
        const inspectionMachine = machinesList.find(
          (m) => (m.operation ?? "").toLowerCase() === "inspection"
        )
        if (!inspectionMachine) {
          setFloorInspectionBarcodeError("No machine configured for Inspection operation.")
          return
        }
        const inspectionOperators = operatorsList.filter(
          (op) => (op.operation ?? "").toLowerCase() === "inspection"
        )
        const operatorName =
          inspectionOperators[0]?.operatorName?.trim() ||
          user?.username?.trim() ||
          "Floor"
        const newJobCard = await createJobCard({
          jobCardNumber: "",
          workOrderId: wo.id,
          operation: "Inspection",
          machineId: inspectionMachine.id,
          operatorName,
          shift: "A",
        })
        targetCardId = newJobCard.id
      }

      await scanRoll(targetCardId, barcode)

      setFloorInspectionBarcode("")
      setInspectionCreateChildMessage("Roll loaded.")
      setInspectionRollsRefreshKey((key) => key + 1)
      if (options?.closePicker) closeFloorInspectionWipPicker()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not load roll. Try again."
      setFloorInspectionBarcodeError(detail)
    } finally {
      setFloorInspectionBarcodeChecking(false)
    }
  }

  const handleFloorInspectionBarcodeSubmit = async () => {
    await applyFloorInspectionFromBarcode(floorInspectionBarcode)
  }

  const closeFloorEclWipPicker = () => {
    setFloorEclWipPickerOpen(false)
    setFloorEclWipRollsError(null)
    setFloorEclWipRolls([])
  }

  const closeFloorEclRmPicker = () => {
    setFloorEclRmPickerOpen(false)
    setFloorEclRmRollsError(null)
    setFloorEclRmRolls([])
  }

  const ensureEclJobCard = async (woId: number): Promise<{ id: number; jobCardNumber: string }> => {
    const cards = await getAllJobCards(0, 50, woId, "ECL")
    const cardInfos = await Promise.all(
      cards.map(async (card) => {
        try {
          const rolls = await getLoadedRolls(card.id)
          return { card, rolls }
        } catch {
          return { card, rolls: [] as CurrentRoll[] }
        }
      })
    )

    const hasRole = (rolls: CurrentRoll[], role: "wip" | "rm") =>
      rolls.some((r) => getEclParentRole(r.stage) === role)

    // Prefer a card that already has the complementary parent and is missing this load's pair room.
    // Callers pass preferred incomplete card via sorting below.
    const incompletePair = cardInfos.find(
      ({ rolls }) =>
        (hasRole(rolls, "wip") && !hasRole(rolls, "rm")) ||
        (!hasRole(rolls, "wip") && hasRole(rolls, "rm"))
    )
    if (incompletePair) return { id: incompletePair.card.id, jobCardNumber: incompletePair.card.jobCardNumber }

    const empty = cardInfos.find(({ rolls }) => rolls.length === 0)
    if (empty) return { id: empty.card.id, jobCardNumber: empty.card.jobCardNumber }

    if (cards.length > 0) {
      // All cards are full (both parents) — create a fresh card for the next pair
      const full = cardInfos.every(
        ({ rolls }) => hasRole(rolls, "wip") && hasRole(rolls, "rm")
      )
      if (!full) {
        return { id: cards[0].id, jobCardNumber: cards[0].jobCardNumber }
      }
    }

    const [operatorsList, machinesList] = await Promise.all([
      getAllOperators(0, 500),
      getAllMachines(0, 500),
    ])
    const eclMachine = machinesList.find((m) => (m.operation ?? "").toLowerCase() === "ecl")
    if (!eclMachine) {
      throw new Error("No machine configured for ECL operation.")
    }
    const eclOperators = operatorsList.filter((op) => (op.operation ?? "").toLowerCase() === "ecl")
    const operatorName =
      eclOperators[0]?.operatorName?.trim() || user?.username?.trim() || "Floor"
    const newJobCard = await createJobCard({
      jobCardNumber: "",
      workOrderId: woId,
      operation: "ECL",
      machineId: eclMachine.id,
      operatorName,
      shift: "A",
    })
    return { id: newJobCard.id, jobCardNumber: newJobCard.jobCardNumber }
  }

  const applyFloorEclFromBarcode = async (
    barcodeRaw: string,
    options?: { closePicker?: boolean; slot?: "wip" | "rm" }
  ) => {
    const barcode = barcodeRaw.trim()
    if (!barcode) return
    setFloorEclBarcodeError(null)
    setFloorEclBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorEclBarcodeError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setFloorEclBarcodeError("This roll is already consumed.")
        return
      }

      const role = getEclParentRole(roll.stage)
      if (!role) {
        setFloorEclBarcodeError(
          `Roll must be WIP Printing/Inspection or RM Film (virgin RM / RM Balance). Current stage: ${roll.stage || "—"}`
        )
        return
      }
      if (options?.slot && options.slot !== role) {
        setFloorEclBarcodeError(
          options.slot === "wip"
            ? "This slot needs a WIP parent roll."
            : "This slot needs an RM Film (virgin RM or RM Balance) roll."
        )
        return
      }

      let wo: WorkOrderMaster | undefined

      if (role === "wip") {
        const woInfo = await getWorkOrderByRollBarcode(barcode)
        if (!woInfo) {
          setFloorEclBarcodeError(
            "No work order linked to this roll (roll must come from a production job card)."
          )
          return
        }
        wo = eclWorkOrders.find((w) => w.id === woInfo.workOrderId)
        if (!wo) {
          try {
            const allWos = await getAllWorkOrders(0, 500)
            wo = allWos.find((w) => w.id === woInfo.workOrderId)
          } catch {
            wo = undefined
          }
        }
        if (!wo) {
          setFloorEclBarcodeError("Work order not found for this roll.")
          return
        }
        if (isOperationSkipped(wo.skippedOperations, "ECL")) {
          setFloorEclBarcodeError("ECL was skipped for this work order.")
          return
        }
        const allowed = allowedWipStagesForDept("ECL", wo.skippedOperations)
        if (!isAllowedWipStage(roll.stage, allowed)) {
          setFloorEclBarcodeError(
            `This work order needs a ${wipStageLabel(allowed[0])} roll for ECL.`
          )
          return
        }
      } else {
        wo = eclSelectedWo ?? undefined
        if (!wo) {
          setFloorEclBarcodeError(
            "Load the WIP Printing/Inspection parent first (or open a work order), then load RM Film."
          )
          return
        }
      }

      let targetCardId: number
      try {
        const card = await ensureEclJobCard(wo.id)
        targetCardId = card.id
      } catch (err: unknown) {
        setFloorEclBarcodeError(
          (err as { message?: string })?.message || "Could not create ECL job card."
        )
        return
      }

      // Prefer card that already has the complementary parent when loading the second slot
      const cards = await getAllJobCards(0, 50, wo.id, "ECL")
      for (const card of cards) {
        try {
          const loaded = await getLoadedRolls(card.id)
          const hasWip = loaded.some((r) => getEclParentRole(r.stage) === "wip")
          const hasRm = loaded.some((r) => getEclParentRole(r.stage) === "rm")
          if (role === "wip" && !hasWip && hasRm) {
            targetCardId = card.id
            break
          }
          if (role === "rm" && hasWip && !hasRm) {
            targetCardId = card.id
            break
          }
        } catch {
          // ignore
        }
      }

      await scanRoll(targetCardId, barcode)

      setFloorEclBarcode("")
      setFloorEclDetailWipBarcode("")
      setFloorEclDetailRmBarcode("")
      setEclSelectedWo(wo)
      setEclRollsRefreshKey((key) => key + 1)
      if (options?.closePicker) {
        if (role === "rm") closeFloorEclRmPicker()
        else closeFloorEclWipPicker()
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not load roll. Try again."
      setFloorEclBarcodeError(detail)
    } finally {
      setFloorEclBarcodeChecking(false)
    }
  }

  const handleFloorEclBarcodeSubmit = async () => {
    await applyFloorEclFromBarcode(floorEclBarcode)
  }

  const ensurePrintingJobCard = async (woId: number): Promise<number> => {
    const cards = await getAllJobCards(0, 50, woId, "Printing")
    for (const card of cards) {
      try {
        const current = await getCurrentRoll(card.id)
        if (!current) return card.id
      } catch {
        // ignore and try next card
      }
    }

    const [operatorsList, machinesList] = await Promise.all([
      getAllOperators(0, 500),
      getAllMachines(0, 500),
    ])
    const printingMachine = machinesList.find(
      (m) => (m.operation ?? "").toLowerCase() === "printing"
    )
    if (!printingMachine) {
      throw new Error("No machine configured for Printing operation.")
    }
    const printingOperators = operatorsList.filter(
      (op) => (op.operation ?? "").toLowerCase() === "printing"
    )
    const operatorName =
      printingOperators[0]?.operatorName?.trim() || user?.username?.trim() || "Floor"
    const newJobCard = await createJobCard({
      jobCardNumber: "",
      workOrderId: woId,
      operation: "Printing",
      machineId: printingMachine.id,
      operatorName,
      shift: "A",
    })
    return newJobCard.id
  }

  const applyFloorPrintingFromBarcode = async (
    barcodeRaw: string,
    options?: { closePicker?: boolean }
  ) => {
    const barcode = barcodeRaw.trim()
    const wo = printingSelectedWo
    if (!wo) return
    if (!barcode) {
      setFloorPrintingBarcodeError("Scan or enter a roll barcode first.")
      return
    }
    setFloorPrintingBarcodeError(null)
    setFloorPrintingBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorPrintingBarcodeError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setFloorPrintingBarcodeError("This roll is already consumed.")
        return
      }
      const stage = (roll.stage ?? "").toLowerCase().replace(/-/g, "_")
      if (!isRmFilmStage(stage)) {
        setFloorPrintingBarcodeError(
          `Only RM virgin or RM Balance rolls can be loaded to Printing. Current stage: ${roll.stage || "—"}`
        )
        return
      }
      if (roll.issued) {
        setFloorPrintingBarcodeError("Roll already issued and cannot be loaded.")
        return
      }

      const targetCardId = await ensurePrintingJobCard(wo.id)
      await scanRoll(targetCardId, barcode)
      setFloorPrintingBarcode("")
      setPrintingCreateChildMessage("Roll loaded.")
      setPrintingRollsRefreshKey((key) => key + 1)
      if (options?.closePicker) closeFloorPrintingRmPicker()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not load roll. Try again."
      setFloorPrintingBarcodeError(detail)
    } finally {
      setFloorPrintingBarcodeChecking(false)
    }
  }

  const handleFloorPrintingBarcodeSubmit = async () => {
    await applyFloorPrintingFromBarcode(floorPrintingBarcode)
  }

  const closeFloorPrintingRmPicker = () => {
    setFloorPrintingRmPickerOpen(false)
    setFloorPrintingRmRollsError(null)
    setFloorPrintingRmRolls([])
  }

  const openFloorPrintingRmPicker = async () => {
    setFloorPrintingRmPickerOpen(true)
    setFloorPrintingRmRollsLoading(true)
    setFloorPrintingRmRollsError(null)
    setFloorPrintingRmRolls([])
    try {
      const filtered = await fetchAvailableRmFilmRolls()
      setFloorPrintingRmRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorPrintingRmRollsError(
          "No available RM virgin or RM Balance rolls found. Try scanning a barcode instead."
        )
      }
    } catch {
      setFloorPrintingRmRollsError("Failed to load stock. Please try again.")
      setFloorPrintingRmRolls([])
    } finally {
      setFloorPrintingRmRollsLoading(false)
    }
  }

  const unloadFloorLoadedRoll = async (
    jobCardId: number,
    rollId: number,
    area: "printing" | "inspection" | "ecl" | "lamination" | "slitting"
  ) => {
    await unloadRoll(jobCardId, rollId)
    if (area === "printing") {
      setPrintingAddRollForm((prev) => (prev?.roll.id === rollId ? null : prev))
      setPrintingFormCommittedForRollId((prev) => (prev === rollId ? null : prev))
      setPrintingRollsRefreshKey((k) => k + 1)
    } else if (area === "inspection") {
      setInspectionAddRollForm((prev) => (prev?.roll.id === rollId ? null : prev))
      setInspectionFormCommittedForRollId((prev) => (prev === rollId ? null : prev))
      setInspectionRollsRefreshKey((k) => k + 1)
    } else if (area === "ecl") {
      setEclAddRollForm((prev) => (prev?.roll.id === rollId ? null : prev))
      setEclFormCommittedForRollId((prev) => (prev === rollId ? null : prev))
      setEclRollsRefreshKey((k) => k + 1)
    } else if (area === "lamination") {
      setLaminationAddRollForm((prev) => (prev?.roll.id === rollId ? null : prev))
      setLaminationFormCommittedForRollId((prev) => (prev === rollId ? null : prev))
      setLaminationRollsRefreshKey((k) => k + 1)
    } else {
      setSlittingAddRollForm((prev) => (prev?.roll.id === rollId ? null : prev))
      setSlittingChildRollsFromDb([])
      setSlittingRollsRefreshKey((k) => k + 1)
    }
  }

  const handleSkipWorkOrder = async (wo: WorkOrderMaster, operation: FloorSkipOperation) => {
    const label = wo.woNumber || `WO #${wo.id}`
    const nextHint =
      operation === "Slitting"
        ? "It will leave the Slitting list."
        : "It will move to the next department."
    if (!window.confirm(`Skip ${operation} for ${label}? ${nextHint}`)) return
    try {
      await skipWorkOrderOperation(wo.id, operation)
      if (operation === "Inspection") {
        if (inspectionSelectedWo?.id === wo.id) setInspectionSelectedWo(null)
        setInspectionRollsRefreshKey((k) => k + 1)
      } else if (operation === "ECL") {
        if (eclSelectedWo?.id === wo.id) setEclSelectedWo(null)
        setEclRollsRefreshKey((k) => k + 1)
      } else if (operation === "Lamination") {
        if (laminationSelectedWo?.id === wo.id) setLaminationSelectedWo(null)
        setLaminationRollsRefreshKey((k) => k + 1)
      } else {
        if (slittingSelectedWo?.id === wo.id) setSlittingSelectedWo(null)
        setSlittingRollsRefreshKey((k) => k + 1)
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not skip this operation."
      window.alert(detail)
    }
  }

  const skipInspectionWorkOrder = (wo: WorkOrderMaster) => handleSkipWorkOrder(wo, "Inspection")
  const skipEclWorkOrder = (wo: WorkOrderMaster) => handleSkipWorkOrder(wo, "ECL")
  const skipLaminationWorkOrder = (wo: WorkOrderMaster) => handleSkipWorkOrder(wo, "Lamination")
  const skipSlittingWorkOrder = (wo: WorkOrderMaster) => handleSkipWorkOrder(wo, "Slitting")

  const openFloorEclWipPicker = async () => {
    setFloorEclWipPickerOpen(true)
    setFloorEclWipRollsLoading(true)
    setFloorEclWipRollsError(null)
    setFloorEclWipRolls([])
    try {
      const stages = eclSelectedWo
        ? allowedWipStagesForDept("ECL", eclSelectedWo.skippedOperations)
        : ["wip_inspection", "wip_printed"]
      const filtered = await fetchAvailableWipRolls(stages)
      setFloorEclWipRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorEclWipRollsError(
          `No available ${stages.map((s) => wipStageLabel(s)).join(" or ")} rolls found. Try scanning a barcode instead.`
        )
      }
    } catch {
      setFloorEclWipRollsError("Failed to load stock. Please try again.")
      setFloorEclWipRolls([])
    } finally {
      setFloorEclWipRollsLoading(false)
    }
  }

  const openFloorEclRmPicker = async () => {
    if (!eclSelectedWo) {
      setFloorEclBarcodeError("Open a work order or load the WIP parent first, then select RM Film.")
      return
    }
    setFloorEclRmPickerOpen(true)
    setFloorEclRmRollsLoading(true)
    setFloorEclRmRollsError(null)
    setFloorEclRmRolls([])
    try {
      const filtered = await fetchAvailableRmFilmRolls()
      setFloorEclRmRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorEclRmRollsError(
          "No available RM Film (virgin RM or RM Balance) rolls found. Try scanning a barcode instead."
        )
      }
    } catch {
      setFloorEclRmRollsError("Failed to load stock. Please try again.")
      setFloorEclRmRolls([])
    } finally {
      setFloorEclRmRollsLoading(false)
    }
  }

  const closeFloorLaminationWipPicker = () => {
    setFloorLaminationWipPickerOpen(false)
    setFloorLaminationWipRollsError(null)
    setFloorLaminationWipRolls([])
  }

  const closeFloorLaminationRmPicker = () => {
    setFloorLaminationRmPickerOpen(false)
    setFloorLaminationRmRollsError(null)
    setFloorLaminationRmRolls([])
  }

  const ensureLaminationJobCard = async (woId: number): Promise<{ id: number; jobCardNumber: string }> => {
    const cards = await getAllJobCards(0, 50, woId, "Lamination")
    const cardInfos = await Promise.all(
      cards.map(async (card) => {
        try {
          const rolls = await getLoadedRolls(card.id)
          return { card, rolls }
        } catch {
          return { card, rolls: [] as CurrentRoll[] }
        }
      })
    )

    const hasRole = (rolls: CurrentRoll[], role: "wip" | "rm") =>
      rolls.some((r) => getLaminationParentRole(r.stage) === role)

    const incompletePair = cardInfos.find(
      ({ rolls }) =>
        (hasRole(rolls, "wip") && !hasRole(rolls, "rm")) ||
        (!hasRole(rolls, "wip") && hasRole(rolls, "rm"))
    )
    if (incompletePair) return { id: incompletePair.card.id, jobCardNumber: incompletePair.card.jobCardNumber }

    const empty = cardInfos.find(({ rolls }) => rolls.length === 0)
    if (empty) return { id: empty.card.id, jobCardNumber: empty.card.jobCardNumber }

    if (cards.length > 0) {
      const full = cardInfos.every(
        ({ rolls }) => hasRole(rolls, "wip") && hasRole(rolls, "rm")
      )
      if (!full) {
        return { id: cards[0].id, jobCardNumber: cards[0].jobCardNumber }
      }
    }

    const [operatorsList, machinesList] = await Promise.all([
      getAllOperators(0, 500),
      getAllMachines(0, 500),
    ])
    const laminationMachine = machinesList.find(
      (m) => (m.operation ?? "").toLowerCase() === "lamination"
    )
    if (!laminationMachine) {
      throw new Error("No machine configured for Lamination operation.")
    }
    const laminationOperators = operatorsList.filter(
      (op) => (op.operation ?? "").toLowerCase() === "lamination"
    )
    const operatorName =
      laminationOperators[0]?.operatorName?.trim() || user?.username?.trim() || "Floor"
    const newJobCard = await createJobCard({
      jobCardNumber: "",
      workOrderId: woId,
      operation: "Lamination",
      machineId: laminationMachine.id,
      operatorName,
      shift: "A",
    })
    return { id: newJobCard.id, jobCardNumber: newJobCard.jobCardNumber }
  }

  const applyFloorLaminationFromBarcode = async (
    barcodeRaw: string,
    options?: { closePicker?: boolean; slot?: "wip" | "rm" }
  ) => {
    const barcode = barcodeRaw.trim()
    if (!barcode) return
    setFloorLaminationBarcodeError(null)
    setFloorLaminationBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorLaminationBarcodeError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setFloorLaminationBarcodeError("This roll is already consumed.")
        return
      }

      const role = getLaminationParentRole(roll.stage)
      if (!role) {
        setFloorLaminationBarcodeError(
          `Roll must be a WIP parent or RM Film (virgin RM / RM Balance). Current stage: ${roll.stage || "—"}`
        )
        return
      }
      if (options?.slot && options.slot !== role) {
        setFloorLaminationBarcodeError(
          options.slot === "wip"
            ? "This slot needs a WIP parent roll."
            : "This slot needs an RM Film (virgin RM or RM Balance) roll."
        )
        return
      }

      let wo: WorkOrderMaster | undefined

      if (role === "wip") {
        const woInfo = await getWorkOrderByRollBarcode(barcode)
        if (!woInfo) {
          setFloorLaminationBarcodeError(
            "No work order linked to this roll (roll must come from a production job card)."
          )
          return
        }
        wo = laminationWorkOrders.find((w) => w.id === woInfo.workOrderId)
        if (!wo) {
          try {
            const allWos = await getAllWorkOrders(0, 500)
            wo = allWos.find((w) => w.id === woInfo.workOrderId)
          } catch {
            wo = undefined
          }
        }
        if (!wo) {
          setFloorLaminationBarcodeError("Work order not found for this roll.")
          return
        }
        if (isOperationSkipped(wo.skippedOperations, "Lamination")) {
          setFloorLaminationBarcodeError("Lamination was skipped for this work order.")
          return
        }
        const allowed = allowedWipStagesForDept("Lamination", wo.skippedOperations)
        if (!isAllowedWipStage(roll.stage, allowed)) {
          setFloorLaminationBarcodeError(
            `This work order needs a ${wipStageLabel(allowed[0])} roll for Lamination.`
          )
          return
        }
      } else {
        wo = laminationSelectedWo ?? undefined
        if (!wo) {
          setFloorLaminationBarcodeError(
            "Load the WIP parent first (or open a work order), then load RM Film."
          )
          return
        }
      }

      let targetCardId: number
      try {
        const card = await ensureLaminationJobCard(wo.id)
        targetCardId = card.id
      } catch (err: unknown) {
        setFloorLaminationBarcodeError(
          (err as { message?: string })?.message || "Could not create Lamination job card."
        )
        return
      }

      const cards = await getAllJobCards(0, 50, wo.id, "Lamination")
      for (const card of cards) {
        try {
          const loaded = await getLoadedRolls(card.id)
          const hasWip = loaded.some((r) => getLaminationParentRole(r.stage) === "wip")
          const hasRm = loaded.some((r) => getLaminationParentRole(r.stage) === "rm")
          if (role === "wip" && !hasWip && hasRm) {
            targetCardId = card.id
            break
          }
          if (role === "rm" && hasWip && !hasRm) {
            targetCardId = card.id
            break
          }
        } catch {
          // ignore
        }
      }

      await scanRoll(targetCardId, barcode)

      setFloorLaminationBarcode("")
      setFloorLaminationDetailWipBarcode("")
      setFloorLaminationDetailRmBarcode("")
      setLaminationSelectedWo(wo)
      setLaminationRollsRefreshKey((key) => key + 1)
      if (options?.closePicker) {
        if (role === "rm") closeFloorLaminationRmPicker()
        else closeFloorLaminationWipPicker()
      }
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not load roll. Try again."
      setFloorLaminationBarcodeError(detail)
    } finally {
      setFloorLaminationBarcodeChecking(false)
    }
  }

  const handleFloorLaminationBarcodeSubmit = async () => {
    await applyFloorLaminationFromBarcode(floorLaminationBarcode)
  }

  const openFloorLaminationWipPicker = async () => {
    setFloorLaminationWipPickerOpen(true)
    setFloorLaminationWipRollsLoading(true)
    setFloorLaminationWipRollsError(null)
    setFloorLaminationWipRolls([])
    try {
      const stages = laminationSelectedWo
        ? allowedWipStagesForDept("Lamination", laminationSelectedWo.skippedOperations)
        : ["wip_ecl", "wip_inspection", "wip_printed"]
      const filtered = await fetchAvailableWipRolls(stages)
      setFloorLaminationWipRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorLaminationWipRollsError(
          `No available ${stages.map((s) => wipStageLabel(s)).join(" or ")} rolls found. Try scanning a barcode instead.`
        )
      }
    } catch {
      setFloorLaminationWipRollsError("Failed to load stock. Please try again.")
      setFloorLaminationWipRolls([])
    } finally {
      setFloorLaminationWipRollsLoading(false)
    }
  }

  const openFloorLaminationRmPicker = async () => {
    if (!laminationSelectedWo) {
      setFloorLaminationBarcodeError(
        "Open a work order or load the WIP ECL parent first, then select RM Film."
      )
      return
    }
    setFloorLaminationRmPickerOpen(true)
    setFloorLaminationRmRollsLoading(true)
    setFloorLaminationRmRollsError(null)
    setFloorLaminationRmRolls([])
    try {
      const filtered = await fetchAvailableRmFilmRolls()
      setFloorLaminationRmRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorLaminationRmRollsError(
          "No available RM Film (virgin RM or RM Balance) rolls found. Try scanning a barcode instead."
        )
      }
    } catch {
      setFloorLaminationRmRollsError("Failed to load stock. Please try again.")
      setFloorLaminationRmRolls([])
    } finally {
      setFloorLaminationRmRollsLoading(false)
    }
  }

  const openFloorInspectionWipPicker = async () => {
    const wo = inspectionSelectedWo
    if (!wo) return
    setFloorInspectionWipPickerOpen(true)
    setFloorInspectionWipRollsLoading(true)
    setFloorInspectionWipRollsError(null)
    setFloorInspectionWipRolls([])
    try {
      const rolls = await getRollsStockByWorkOrder(wo.id, "wip_printed")
      const byId = new Map<number, RollsStockRow>()
      for (const roll of rolls as RollsStockRow[]) byId.set(roll.id, roll)
      let frontier = rolls.map((r) => r.id)
      while (frontier.length > 0) {
        const children = (await getRollsStockByParentIds(frontier, "wip_printed")) as RollsStockRow[]
        const next: number[] = []
        for (const child of children) {
          if (!byId.has(child.id)) {
            byId.set(child.id, child)
            next.push(child.id)
          }
        }
        frontier = next
      }
      const filtered = [...byId.values()].filter((r) => !r.consumed && !r.issued)
      setFloorInspectionWipRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorInspectionWipRollsError(
          "No available WIP printing rolls found for this work order. Try scanning a barcode instead."
        )
      }
    } catch {
      setFloorInspectionWipRollsError("Failed to load stock. Please try again.")
      setFloorInspectionWipRolls([])
    } finally {
      setFloorInspectionWipRollsLoading(false)
    }
  }

  const closeFloorSlittingParentPicker = () => {
    setFloorSlittingParentPickerOpen(false)
    setFloorSlittingParentRollsError(null)
    setFloorSlittingParentRolls([])
  }

  const ensureSlittingJobCard = async (woId: number): Promise<{ id: number; jobCardNumber: string }> => {
    const cards = await getAllJobCards(0, 50, woId, "Slitting")
    for (const card of cards) {
      try {
        const rolls = await getLoadedRolls(card.id)
        if (rolls.length === 0) {
          return { id: card.id, jobCardNumber: card.jobCardNumber }
        }
      } catch {
        // try next
      }
    }

    const [operatorsList, machinesList] = await Promise.all([
      getAllOperators(0, 500),
      getAllMachines(0, 500),
    ])
    const slittingMachine = machinesList.find(
      (m) => (m.operation ?? "").toLowerCase() === "slitting"
    )
    if (!slittingMachine) {
      throw new Error("No machine configured for Slitting operation.")
    }
    const slittingOperators = operatorsList.filter(
      (op) => (op.operation ?? "").toLowerCase() === "slitting"
    )
    const operatorName =
      slittingOperators[0]?.operatorName?.trim() || user?.username?.trim() || "Floor"
    const newJobCard = await createJobCard({
      jobCardNumber: "",
      workOrderId: woId,
      operation: "Slitting",
      machineId: slittingMachine.id,
      operatorName,
      shift: "A",
    })
    return { id: newJobCard.id, jobCardNumber: newJobCard.jobCardNumber }
  }

  const applyFloorSlittingFromBarcode = async (
    barcodeRaw: string,
    options?: { closePicker?: boolean }
  ) => {
    const barcode = barcodeRaw.trim()
    if (!barcode) return
    setFloorSlittingBarcodeError(null)
    setFloorSlittingBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorSlittingBarcodeError("Roll not found for this barcode.")
        return
      }
      if (roll.consumed) {
        setFloorSlittingBarcodeError("This roll is already consumed.")
        return
      }
      if (!isSlittingParentStage(roll.stage)) {
        setFloorSlittingBarcodeError(
          `Roll must be a previous-stage WIP roll. Current stage: ${roll.stage || "—"}`
        )
        return
      }

      const woInfo = await getWorkOrderByRollBarcode(barcode)
      if (!woInfo) {
        setFloorSlittingBarcodeError(
          "No work order linked to this roll (roll must come from a production job card)."
        )
        return
      }

      let wo = slittingWorkOrders.find((w) => w.id === woInfo.workOrderId)
      if (!wo) {
        try {
          const allWos = await getAllWorkOrders(0, 500)
          wo = allWos.find((w) => w.id === woInfo.workOrderId)
        } catch {
          wo = undefined
        }
      }
      if (!wo) {
        setFloorSlittingBarcodeError("Work order not found for this roll.")
        return
      }
      if (isOperationSkipped(wo.skippedOperations, "Slitting")) {
        setFloorSlittingBarcodeError("Slitting was skipped for this work order.")
        return
      }
      const allowed = allowedWipStagesForDept("Slitting", wo.skippedOperations)
      if (!isAllowedWipStage(roll.stage, allowed)) {
        setFloorSlittingBarcodeError(
          `This work order needs a ${wipStageLabel(allowed[0])} roll for Slitting.`
        )
        return
      }

      const card = await ensureSlittingJobCard(wo.id)
      await scanRoll(card.id, barcode)

      setFloorSlittingBarcode("")
      setSlittingSelectedWo(wo)
      setSlittingRollsRefreshKey((key) => key + 1)
      if (options?.closePicker) closeFloorSlittingParentPicker()
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as { message?: string })?.message ||
        "Could not load roll. Try again."
      setFloorSlittingBarcodeError(detail)
    } finally {
      setFloorSlittingBarcodeChecking(false)
    }
  }

  const handleFloorSlittingBarcodeSubmit = async () => {
    await applyFloorSlittingFromBarcode(floorSlittingBarcode)
  }

  const openFloorSlittingParentPicker = async () => {
    setFloorSlittingParentPickerOpen(true)
    setFloorSlittingParentRollsLoading(true)
    setFloorSlittingParentRollsError(null)
    setFloorSlittingParentRolls([])
    try {
      const stages = slittingSelectedWo
        ? allowedWipStagesForDept("Slitting", slittingSelectedWo.skippedOperations)
        : ["wip_lamination", "wip_ecl", "wip_inspection", "wip_printed"]
      const filtered = await fetchAvailableWipRolls(stages)
      setFloorSlittingParentRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorSlittingParentRollsError(
          `No available ${stages.map((s) => wipStageLabel(s)).join(" or ")} rolls found. Try scanning a barcode instead.`
        )
      }
    } catch {
      setFloorSlittingParentRollsError("Failed to load stock. Please try again.")
      setFloorSlittingParentRolls([])
    } finally {
      setFloorSlittingParentRollsLoading(false)
    }
  }

  // Floor Printing page: show active work orders that have a Printing job card
  useEffect(() => {
    if (!isFloorUser || floorView !== "printing") return
    let cancelled = false
    const run = async () => {
      setPrintingLoading(true)
      setPrintingError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "Printing")
        const printingWorkOrderIds = new Set<number>(cards.map((c) => c.workOrderId))
        if (cancelled) return
        const allWos = await getAllWorkOrders(0, 500)
        const filtered = allWos.filter(
          (wo) =>
            printingWorkOrderIds.has(wo.id) &&
            wo.status !== "printed" &&
            wo.status !== "completed" &&
            wo.status !== "cancelled"
        )
        if (!cancelled) setPrintingWorkOrders(filtered)
      } catch (err) {
        if (!cancelled) {
          setPrintingError("Failed to load work orders.")
          setPrintingWorkOrders([])
        }
      } finally {
        if (!cancelled) setPrintingLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isFloorUser, floorView])

  // Floor Inspection page: WOs with available WIP Printing rolls to load,
  // plus WOs that already have an Inspection job card with a loaded roll.
  useEffect(() => {
    if (!isFloorUser || floorView !== "inspection") return
    let cancelled = false
    const run = async () => {
      setInspectionLoading(true)
      setInspectionError(null)
      try {
        const BATCH = 15
        const stagesByWo = await workOrderStagesFromAvailableRolls(["wip_printed"], () => cancelled)
        if (cancelled) return

        const loadedWorkOrderIds = new Set<number>()
        const inspectionCards = await getAllJobCards(0, 500, undefined, "Inspection")
        for (let i = 0; i < inspectionCards.length; i += BATCH) {
          if (cancelled) return
          const batch = inspectionCards.slice(i, i + BATCH)
          const results = await Promise.all(
            batch.map(async (c) => {
              try {
                const roll = await getCurrentRoll(c.id)
                return { workOrderId: c.workOrderId, hasRoll: roll != null }
              } catch {
                return { workOrderId: c.workOrderId, hasRoll: false }
              }
            })
          )
          results.forEach((r) => {
            if (r.hasRoll) loadedWorkOrderIds.add(r.workOrderId)
          })
        }
        if (cancelled) return

        const allWos = await getAllWorkOrders(0, 500)
        if (!cancelled) {
          setInspectionWorkOrders(
            filterDepartmentWorkOrders(allWos, "Inspection", stagesByWo, loadedWorkOrderIds)
          )
        }
      } catch (err) {
        if (!cancelled) {
          setInspectionError("Failed to load work orders.")
          setInspectionWorkOrders([])
        }
      } finally {
        if (!cancelled) setInspectionLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isFloorUser, floorView, inspectionRollsRefreshKey])

  // Floor ECL: WOs with available WIP Inspection rolls (or WIP Printing if Inspection skipped),
  // plus WOs that already have an ECL job card with a loaded roll.
  useEffect(() => {
    if (!isFloorUser || floorView !== "ecl") return
    let cancelled = false
    const run = async () => {
      setEclLoading(true)
      setEclError(null)
      try {
        const BATCH = 15
        const stagesByWo = await workOrderStagesFromAvailableRolls(
          ["wip_inspection", "wip_printed"],
          () => cancelled
        )
        if (cancelled) return

        const loadedWorkOrderIds = new Set<number>()
        const eclCards = await getAllJobCards(0, 500, undefined, "ECL")
        for (let i = 0; i < eclCards.length; i += BATCH) {
          if (cancelled) return
          const batch = eclCards.slice(i, i + BATCH)
          const results = await Promise.all(
            batch.map(async (c) => {
              try {
                const rolls = await getLoadedRolls(c.id)
                return { workOrderId: c.workOrderId, hasRoll: rolls.length > 0 }
              } catch {
                return { workOrderId: c.workOrderId, hasRoll: false }
              }
            })
          )
          results.forEach((r) => {
            if (r.hasRoll) loadedWorkOrderIds.add(r.workOrderId)
          })
        }
        if (cancelled) return

        const allWos = await getAllWorkOrders(0, 500)
        if (!cancelled) {
          setEclWorkOrders(filterDepartmentWorkOrders(allWos, "ECL", stagesByWo, loadedWorkOrderIds))
        }
      } catch (err) {
        if (!cancelled) {
          setEclError("Failed to load work orders.")
          setEclWorkOrders([])
        }
      } finally {
        if (!cancelled) setEclLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isFloorUser, floorView, eclRollsRefreshKey])

  // Floor Lamination: WOs with available WIP ECL rolls (or previous WIP if ECL skipped),
  // plus WOs that already have a Lamination job card with a loaded roll.
  useEffect(() => {
    if (!isFloorUser || floorView !== "lamination") return
    let cancelled = false
    const run = async () => {
      setLaminationLoading(true)
      setLaminationError(null)
      try {
        const BATCH = 15
        const stagesByWo = await workOrderStagesFromAvailableRolls(
          ["wip_ecl", "wip_inspection", "wip_printed"],
          () => cancelled
        )
        if (cancelled) return

        const loadedWorkOrderIds = new Set<number>()
        const laminationCards = await getAllJobCards(0, 500, undefined, "Lamination")
        for (let i = 0; i < laminationCards.length; i += BATCH) {
          if (cancelled) return
          const batch = laminationCards.slice(i, i + BATCH)
          const results = await Promise.all(
            batch.map(async (c) => {
              try {
                const rolls = await getLoadedRolls(c.id)
                return { workOrderId: c.workOrderId, hasRoll: rolls.length > 0 }
              } catch {
                return { workOrderId: c.workOrderId, hasRoll: false }
              }
            })
          )
          results.forEach((r) => {
            if (r.hasRoll) loadedWorkOrderIds.add(r.workOrderId)
          })
        }
        if (cancelled) return

        const allWos = await getAllWorkOrders(0, 500)
        if (!cancelled) {
          setLaminationWorkOrders(
            filterDepartmentWorkOrders(allWos, "Lamination", stagesByWo, loadedWorkOrderIds)
          )
        }
      } catch (err) {
        if (!cancelled) {
          setLaminationError("Failed to load work orders.")
          setLaminationWorkOrders([])
        }
      } finally {
        if (!cancelled) setLaminationLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isFloorUser, floorView, laminationRollsRefreshKey])

  // Floor Slitting: WOs with available WIP Lamination rolls (or previous WIP if Lamination skipped),
  // plus WOs that already have a Slitting job card with a loaded parent.
  useEffect(() => {
    if (!isFloorUser || floorView !== "slitting") return
    let cancelled = false
    const run = async () => {
      setSlittingLoading(true)
      setSlittingError(null)
      try {
        const BATCH = 15
        const stagesByWo = await workOrderStagesFromAvailableRolls(
          ["wip_lamination", "wip_ecl", "wip_inspection", "wip_printed"],
          () => cancelled
        )
        if (cancelled) return

        const loadedWorkOrderIds = new Set<number>()
        const slittingCards = await getAllJobCards(0, 500, undefined, "Slitting")
        for (let i = 0; i < slittingCards.length; i += BATCH) {
          if (cancelled) return
          const batch = slittingCards.slice(i, i + BATCH)
          const results = await Promise.all(
            batch.map(async (c) => {
              try {
                const rolls = await getLoadedRolls(c.id)
                return { workOrderId: c.workOrderId, hasRoll: rolls.length > 0 }
              } catch {
                return { workOrderId: c.workOrderId, hasRoll: false }
              }
            })
          )
          results.forEach((r) => {
            if (r.hasRoll) loadedWorkOrderIds.add(r.workOrderId)
          })
        }
        if (cancelled) return

        const allWos = await getAllWorkOrders(0, 500)
        if (!cancelled) {
          setSlittingWorkOrders(
            filterDepartmentWorkOrders(allWos, "Slitting", stagesByWo, loadedWorkOrderIds)
          )
        }
      } catch (err) {
        if (!cancelled) {
          setSlittingError("Failed to load work orders.")
          setSlittingWorkOrders([])
        }
      } finally {
        if (!cancelled) setSlittingLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isFloorUser, floorView, slittingRollsRefreshKey])

  // When Floor user selects a work order in Printing section, fetch current loaded roll(s) and show form for first roll
  useEffect(() => {
    if (!printingSelectedWo) {
      setPrintingLoadedRolls([])
      setPrintingAddRollForm(null)
      setPrintingAddRollEditingField(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setPrintingRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, printingSelectedWo.id, "Printing")
        const results = await Promise.all(
          cards.map(async (c) => {
            try {
              const roll = await getCurrentRoll(c.id)
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll }
            } catch {
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll: null }
            }
          })
        )
        if (!cancelled) {
          const loaded = results.filter((r): r is { jobCardNumber: string; jobCardId: number; roll: CurrentRoll } => r.roll != null)
          setPrintingLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
            setPrintingAddRollForm((prev) => {
              if (prev?.roll.id === first.roll.id) return prev
              return {
                jobCardNumber: first.jobCardNumber,
                jobCardId: first.jobCardId,
                roll: first.roll,
                parent: { gradeId: undefined },
                size: first.roll.size != null ? String(first.roll.size) : "",
                micron: first.roll.micron != null ? String(first.roll.micron) : "",
                netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                meter: "",
                grossweight: grossFromScale || (first.roll.netweight != null ? String(first.roll.netweight) : ""),
                wastage: "0",
                plainWastage: "0",
                printedWastage: "0",
                inkGsm: "",
                balanceweight:
                  first.roll.balanceWeight != null
                    ? String(first.roll.balanceWeight)
                    : first.roll.balance_weight != null
                      ? String(first.roll.balance_weight)
                      : "",
              }
            })
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                setPrintingAddRollEditingField(null)
                setPrintingAddRollForm((prev) => {
                  if (!prev || prev.roll.id !== first.roll.id) return prev
                  return {
                    ...prev,
                    parent: {
                      gradeId: parent.gradeId ?? prev.parent.gradeId,
                      density: parent.itemDensity ?? prev.parent.density,
                    },
                    balanceweight:
                      parent.balanceWeight != null ? String(parent.balanceWeight) : prev.balanceweight,
                  }
                })
              }
            } catch {
              // Keep the in-progress form; grade can stay unset.
            }
          } else {
            setPrintingAddRollForm(null)
            setPrintingAddRollEditingField(null)
          }
        }
      } catch {
        if (!cancelled) {
          setPrintingLoadedRolls([])
          setPrintingAddRollForm(null)
          setPrintingAddRollEditingField(null)
        }
      } finally {
        if (!cancelled) setPrintingRollsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [printingSelectedWo?.id, printingRollsRefreshKey])

  // When Floor user selects a work order in Inspection section, fetch current loaded roll(s) and show form for first roll
  useEffect(() => {
    if (!inspectionSelectedWo) {
      setInspectionLoadedRolls([])
      setInspectionAddRollForm(null)
      setInspectionAddRollEditingField(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setInspectionRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, inspectionSelectedWo.id, "Inspection")
        const results = await Promise.all(
          cards.map(async (c) => {
            try {
              const roll = await getCurrentRoll(c.id)
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll }
            } catch {
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll: null }
            }
          })
        )
        if (!cancelled) {
          const loaded = results
            .filter((r): r is { jobCardNumber: string; jobCardId: number; roll: CurrentRoll } => r.roll != null)
            .map((row) => {
              const card = cards.find((c) => c.id === row.jobCardId)
              return {
                ...row,
                operatorName: card?.operatorName,
                shift: card?.shift,
              }
            })
          setInspectionLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            const firstCard = cards.find((c) => c.id === first.jobCardId)
            const outputFromScale = scaleWeight != null ? String(scaleWeight) : ""
            const outputWeight =
              outputFromScale || (first.roll.netweight != null ? String(first.roll.netweight) : "")
            const inputWeight = Number(first.roll.netweight || 0)
            const parsedOutput = parseFloat(outputWeight)
            const parentBalance =
              first.roll.balanceWeight != null
                ? String(first.roll.balanceWeight)
                : first.roll.balance_weight != null
                  ? String(first.roll.balance_weight)
                  : ""
            const parsedBalance = parseFloat(parentBalance)
            const wastage =
              Number.isNaN(parsedOutput)
                ? "0"
                : String(
                    Math.max(
                      0,
                      Number(
                        (
                          inputWeight -
                          parsedOutput -
                          (Number.isNaN(parsedBalance) ? 0 : parsedBalance)
                        ).toFixed(2)
                      )
                    )
                  )
            setInspectionAddRollForm((prev) => {
              if (prev?.roll.id === first.roll.id) return prev
              return {
                jobCardNumber: first.jobCardNumber,
                jobCardId: first.jobCardId,
                roll: first.roll,
                parent: { gradeId: undefined },
                size: first.roll.size != null ? String(first.roll.size) : "",
                micron: first.roll.micron != null ? String(first.roll.micron) : "",
                netweight: outputWeight,
                wastage,
                wastageReason: "",
                noOfTag: "",
                noOfCuts: "",
                operatorName: firstCard?.operatorName ?? "",
                shift: firstCard?.shift ?? "A",
                remark: "",
                balanceweight: parentBalance,
              }
            })
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                setInspectionAddRollEditingField(null)
                setInspectionAddRollForm((prev) => {
                  if (!prev || prev.roll.id !== first.roll.id) return prev
                  return {
                    ...prev,
                    parent: { gradeId: parent.gradeId ?? prev.parent.gradeId },
                    balanceweight:
                      parent.balanceWeight != null ? String(parent.balanceWeight) : prev.balanceweight,
                    roll: {
                      ...prev.roll,
                      balanceWeight: parent.balanceWeight ?? prev.roll.balanceWeight ?? prev.roll.balance_weight,
                      balance_weight: parent.balanceWeight ?? prev.roll.balanceWeight ?? prev.roll.balance_weight,
                    },
                  }
                })
              }
            } catch {
              // Keep the in-progress form; grade can stay unset.
            }
          } else {
            setInspectionAddRollForm(null)
            setInspectionAddRollEditingField(null)
          }
        }
      } catch {
        if (!cancelled) {
          setInspectionLoadedRolls([])
          setInspectionAddRollForm(null)
          setInspectionAddRollEditingField(null)
        }
      } finally {
        if (!cancelled) setInspectionRollsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [inspectionSelectedWo?.id, inspectionRollsRefreshKey])

  // When Floor user selects a work order in ECL section, fetch loaded roll(s) and show form
  useEffect(() => {
    if (!eclSelectedWo) {
      setEclLoadedRolls([])
      setEclAddRollForm(null)
      setEclAddRollEditingField(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setEclRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, eclSelectedWo.id, "ECL")
        const cardRollSets = await Promise.all(
          cards.map(async (c) => {
            try {
              const rolls = await getLoadedRolls(c.id)
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, rolls }
            } catch {
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, rolls: [] as CurrentRoll[] }
            }
          })
        )
        if (cancelled) return

        // Prefer the job card that already has both parents, else the one with the most loaded parents
        const scored = cardRollSets
          .map((set) => {
            const hasWip = set.rolls.some((r) => getEclParentRole(r.stage) === "wip")
            const hasRm = set.rolls.some((r) => getEclParentRole(r.stage) === "rm")
            const score = (hasWip && hasRm ? 100 : 0) + set.rolls.length
            return { ...set, score }
          })
          .sort((a, b) => b.score - a.score)

        const best = scored[0]
        const loaded =
          best && best.rolls.length > 0
            ? best.rolls.map((roll) => ({
                jobCardNumber: best.jobCardNumber,
                jobCardId: best.jobCardId,
                roll,
              }))
            : []

        setEclLoadedRolls(loaded)

        const wipEntry = loaded.find((r) => getEclParentRole(r.roll.stage) === "wip")
        const formSource = wipEntry ?? loaded[0]
        if (formSource) {
          try {
            const parent = await getRollsStockById(formSource.roll.id)
            if (!cancelled) {
              setEclAddRollEditingField(null)
              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
              setEclAddRollForm({
                jobCardNumber: formSource.jobCardNumber,
                jobCardId: formSource.jobCardId,
                roll: formSource.roll,
                parent: { gradeId: parent.gradeId },
                size: formSource.roll.size != null ? String(formSource.roll.size) : "",
                micron: formSource.roll.micron != null ? String(formSource.roll.micron) : "",
                netweight: formSource.roll.netweight != null ? String(formSource.roll.netweight) : "",
                grossweight:
                  grossFromScale ||
                  (parent.grossweight != null
                    ? String(parent.grossweight)
                    : formSource.roll.netweight != null
                      ? String(formSource.roll.netweight)
                      : ""),
              })
            }
          } catch {
            if (!cancelled) {
              setEclAddRollForm(null)
              setEclAddRollEditingField(null)
            }
          }
        } else {
          setEclAddRollForm(null)
          setEclAddRollEditingField(null)
        }
      } catch {
        if (!cancelled) {
          setEclLoadedRolls([])
          setEclAddRollForm(null)
          setEclAddRollEditingField(null)
        }
      } finally {
        if (!cancelled) setEclRollsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eclSelectedWo?.id, eclRollsRefreshKey])

  // When Floor user selects a work order in Lamination section, fetch loaded roll(s) and show form
  useEffect(() => {
    if (!laminationSelectedWo) {
      setLaminationLoadedRolls([])
      setLaminationAddRollForm(null)
      setLaminationAddRollEditingField(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setLaminationRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, laminationSelectedWo.id, "Lamination")
        const cardRollSets = await Promise.all(
          cards.map(async (c) => {
            try {
              const rolls = await getLoadedRolls(c.id)
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, rolls }
            } catch {
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, rolls: [] as CurrentRoll[] }
            }
          })
        )
        if (cancelled) return

        const scored = cardRollSets
          .map((set) => {
            const hasWip = set.rolls.some((r) => getLaminationParentRole(r.stage) === "wip")
            const hasRm = set.rolls.some((r) => getLaminationParentRole(r.stage) === "rm")
            const score = (hasWip && hasRm ? 100 : 0) + set.rolls.length
            return { ...set, score }
          })
          .sort((a, b) => b.score - a.score)

        const best = scored[0]
        const loaded =
          best && best.rolls.length > 0
            ? best.rolls.map((roll) => ({
                jobCardNumber: best.jobCardNumber,
                jobCardId: best.jobCardId,
                roll,
              }))
            : []

        setLaminationLoadedRolls(loaded)

        const wipEntry = loaded.find((r) => getLaminationParentRole(r.roll.stage) === "wip")
        const formSource = wipEntry ?? loaded[0]
        if (formSource) {
          try {
            const parent = await getRollsStockById(formSource.roll.id)
            if (!cancelled) {
              setLaminationAddRollEditingField(null)
              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
              setLaminationAddRollForm({
                jobCardNumber: formSource.jobCardNumber,
                jobCardId: formSource.jobCardId,
                roll: formSource.roll,
                parent: { gradeId: parent.gradeId },
                size: formSource.roll.size != null ? String(formSource.roll.size) : "",
                micron: formSource.roll.micron != null ? String(formSource.roll.micron) : "",
                netweight: formSource.roll.netweight != null ? String(formSource.roll.netweight) : "",
                grossweight:
                  grossFromScale ||
                  (parent.grossweight != null
                    ? String(parent.grossweight)
                    : formSource.roll.netweight != null
                      ? String(formSource.roll.netweight)
                      : ""),
              })
            }
          } catch {
            if (!cancelled) {
              setLaminationAddRollForm(null)
              setLaminationAddRollEditingField(null)
            }
          }
        } else {
          setLaminationAddRollForm(null)
          setLaminationAddRollEditingField(null)
        }
      } catch {
        if (!cancelled) {
          setLaminationLoadedRolls([])
          setLaminationAddRollForm(null)
          setLaminationAddRollEditingField(null)
        }
      } finally {
        if (!cancelled) setLaminationRollsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [laminationSelectedWo?.id, laminationRollsRefreshKey])

  // When Floor user selects a work order in Slitting section, fetch loaded parent and show weight form
  useEffect(() => {
    if (!slittingSelectedWo) {
      setSlittingLoadedRolls([])
      setSlittingAddRollForm(null)
      setSlittingAddRollEditingField(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setSlittingRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, slittingSelectedWo.id, "Slitting")
        const results = await Promise.all(
          cards.map(async (c) => {
            try {
              const rolls = await getLoadedRolls(c.id)
              return rolls.map((roll) => ({
                jobCardNumber: c.jobCardNumber,
                jobCardId: c.id,
                roll,
              }))
            } catch {
              return [] as { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
            }
          })
        )
        if (!cancelled) {
          const loaded = results.flat()
          setSlittingLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                setSlittingAddRollEditingField(null)
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setSlittingAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: "",
                  grossweight: grossFromScale,
                })
              }
            } catch {
              if (!cancelled) {
                setSlittingAddRollForm(null)
                setSlittingAddRollEditingField(null)
              }
            }
          } else {
            setSlittingAddRollForm(null)
            setSlittingAddRollEditingField(null)
          }
        }
      } catch {
        if (!cancelled) {
          setSlittingLoadedRolls([])
          setSlittingAddRollForm(null)
          setSlittingAddRollEditingField(null)
        }
      } finally {
        if (!cancelled) setSlittingRollsLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [slittingSelectedWo?.id, slittingRollsRefreshKey])

  // Reset committed state and child rolls when switching work order
  useEffect(() => {
    setPrintingFormCommittedForRollId(null)
    setPrintingChildRollsFromDb([])
    setFloorPrintingBarcode("")
    setFloorPrintingBarcodeError(null)
    setFloorPrintingRmPickerOpen(false)
    setFloorPrintingRmRolls([])
    setFloorPrintingRmRollsError(null)
  }, [printingSelectedWo])

  // Reset inspection committed state and child rolls when switching work order
  useEffect(() => {
    setInspectionFormCommittedForRollId(null)
    setInspectionChildRollsFromDb([])
    setFloorInspectionBarcode("")
    setFloorInspectionBarcodeError(null)
    setFloorInspectionWipPickerOpen(false)
    setFloorInspectionWipRolls([])
    setFloorInspectionWipRollsError(null)
  }, [inspectionSelectedWo])

  // Reset ECL committed state and child rolls when switching work order
  useEffect(() => {
    setEclFormCommittedForRollId(null)
    setEclChildRollsFromDb([])
  }, [eclSelectedWo])

  // Reset Lamination committed state and child rolls when switching work order
  useEffect(() => {
    setLaminationFormCommittedForRollId(null)
    setLaminationChildRollsFromDb([])
  }, [laminationSelectedWo])

  // Reset Slitting child rolls when switching work order
  useEffect(() => {
    setSlittingChildRollsFromDb([])
  }, [slittingSelectedWo])

  // Fetch produced rolls (WIP printed) for selected work order from DB.
  useEffect(() => {
    if (!printingSelectedWo) {
      setPrintingChildRollsFromDb([])
      return
    }
    let cancelled = false
    setPrintingChildRollsLoading(true)
    getRollsStockByWorkOrder(printingSelectedWo.id, "wip_printed")
      .then((rows) => {
        if (!cancelled) setPrintingChildRollsFromDb(rows)
      })
      .catch(() => {
        if (!cancelled) setPrintingChildRollsFromDb([])
      })
      .finally(() => {
        if (!cancelled) setPrintingChildRollsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [printingSelectedWo?.id])

  // Fetch produced rolls (WIP inspection) for selected work order from DB.
  useEffect(() => {
    if (!inspectionSelectedWo) {
      setInspectionChildRollsFromDb([])
      return
    }
    let cancelled = false
    setInspectionChildRollsLoading(true)
    getRollsStockByWorkOrder(inspectionSelectedWo.id, "wip_inspection")
      .then((rows) => {
        if (!cancelled) setInspectionChildRollsFromDb(rows)
      })
      .catch(() => {
        if (!cancelled) setInspectionChildRollsFromDb([])
      })
      .finally(() => {
        if (!cancelled) setInspectionChildRollsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [inspectionSelectedWo?.id])

  // Fetch child rolls (WIP ECL) for loaded rolls in ECL section
  useEffect(() => {
    if (eclLoadedRolls.length === 0) {
      setEclChildRollsFromDb([])
      return
    }
    const parentIds = eclLoadedRolls.map((r) => r.roll.id)
    let cancelled = false
    setEclChildRollsLoading(true)
    getRollsStockByParentIds(parentIds, "wip_ecl")
      .then((rows) => {
        if (!cancelled) setEclChildRollsFromDb(rows)
      })
      .catch(() => {
        if (!cancelled) setEclChildRollsFromDb([])
      })
      .finally(() => {
        if (!cancelled) setEclChildRollsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eclLoadedRolls])

  // Fetch child rolls (WIP lamination) for loaded rolls in Lamination section
  useEffect(() => {
    if (laminationLoadedRolls.length === 0) {
      setLaminationChildRollsFromDb([])
      return
    }
    const parentIds = laminationLoadedRolls.map((r) => r.roll.id)
    let cancelled = false
    setLaminationChildRollsLoading(true)
    getRollsStockByParentIds(parentIds, "wip_lamination")
      .then((rows) => {
        if (!cancelled) setLaminationChildRollsFromDb(rows)
      })
      .catch(() => {
        if (!cancelled) setLaminationChildRollsFromDb([])
      })
      .finally(() => {
        if (!cancelled) setLaminationChildRollsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [laminationLoadedRolls])

  // Fetch child rolls (finished goods) for loaded parent in Slitting section
  useEffect(() => {
    if (slittingLoadedRolls.length === 0) {
      setSlittingChildRollsFromDb([])
      return
    }
    const parentIds = slittingLoadedRolls.map((r) => r.roll.id)
    let cancelled = false
    setSlittingChildRollsLoading(true)
    getRollsStockByParentIds(parentIds, "finished_goods")
      .then((rows) => {
        if (!cancelled) setSlittingChildRollsFromDb(rows)
      })
      .catch(() => {
        if (!cancelled) setSlittingChildRollsFromDb([])
      })
      .finally(() => {
        if (!cancelled) setSlittingChildRollsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slittingLoadedRolls])

  // Fetch WIP printing template when on Floor Printing/Inspection/ECL/Lamination/Slitting view (for Print button)
  useEffect(() => {
    if (
      !isFloorUser ||
      (floorView !== "printing" &&
        floorView !== "inspection" &&
        floorView !== "ecl" &&
        floorView !== "lamination" &&
        floorView !== "slitting")
    )
      return
    getAllTemplates(0, 200)
      .then((data) => {
        const t = data.find((template) => template.defaultForm === "wip-printing")
        setWipPrintingTemplate(t ?? null)
      })
      .catch(() => setWipPrintingTemplate(null))
  }, [isFloorUser, floorView])

  // When scale (serial) weight updates and add-roll form is open, use it for gross weight
  useEffect(() => {
    if (printingAddRollForm && scaleWeight != null) {
      setPrintingAddRollForm((prev) =>
        prev ? { ...prev, grossweight: String(scaleWeight) } : null
      )
    }
    if (inspectionAddRollForm && scaleWeight != null) {
      setInspectionAddRollForm((prev) => {
        if (!prev) return null
        const inputWeight = Number(prev.roll.netweight || 0)
        const balance = Number(prev.balanceweight || 0)
        const wastage = String(
          Math.max(0, Number((inputWeight - scaleWeight - (Number.isNaN(balance) ? 0 : balance)).toFixed(2)))
        )
        return { ...prev, netweight: String(scaleWeight), wastage }
      })
    }
    if (eclAddRollForm && scaleWeight != null) {
      setEclAddRollForm((prev) =>
        prev ? { ...prev, grossweight: String(scaleWeight) } : null
      )
    }
    if (laminationAddRollForm && scaleWeight != null) {
      setLaminationAddRollForm((prev) =>
        prev ? { ...prev, grossweight: String(scaleWeight) } : null
      )
    }
    if (slittingAddRollForm && scaleWeight != null) {
      setSlittingAddRollForm((prev) =>
        prev ? { ...prev, grossweight: String(scaleWeight) } : null
      )
    }
  }, [scaleWeight])

  // Printing department: home screen is the Work Order screen
  if (isPrintingUser) {
    return <WorkOrder />
  }

  // Floor department: dedicated home with department tiles; Work Order create is on Printing and in the sidebar
  if (isFloorUser) {
    const floorViewLabel = floorView !== null
      ? floorDepartmentBlocks.find((block) => block.id === floorView)?.label ?? floorView
      : null

    return (
      <FloorShell
        isMobile={isMobile}
        sidebarState={sidebarState}
        floorView={floorView}
        floorViewLabel={floorViewLabel}
        userName={user?.username}
        onBackToDepartments={() => setFloorView(null)}
        isScaleConnected={isScaleConnected}
        isScaleConnecting={isScaleConnecting}
        scaleWeight={scaleWeight}
        scaleWeightError={scaleWeightError}
        isSerialSupported={isSerialSupported}
        onConnectScale={connectScale}
        printerName={printerName}
        printerAvailable={printerAvailable}
        websocketConnected={websocketConnected}
        printingPrintStatus={printingPrintStatus}
      >
          {floorView === null ? (
            <FloorDepartmentGrid onSelect={setFloorView} />
          ) : (
            /* In-place page for selected department (title bar and bottom bar unchanged) */
            <div className={(floorView === "printing" || floorView === "inspection" || floorView === "ecl" || floorView === "lamination" || floorView === "slitting") ? "space-y-4 w-full" : "space-y-4 max-w-4xl"}>
                {(floorView === "printing" && printingSelectedWo) ||
                (floorView === "inspection" && inspectionSelectedWo) ||
                (floorView === "ecl" && eclSelectedWo) ||
                (floorView === "lamination" && laminationSelectedWo) ||
                (floorView === "slitting" && slittingSelectedWo) ? (
                  (() => {
                    const selectedWo =
                      floorView === "printing"
                        ? printingSelectedWo
                        : floorView === "inspection"
                          ? inspectionSelectedWo
                          : floorView === "ecl"
                            ? eclSelectedWo
                            : floorView === "lamination"
                              ? laminationSelectedWo
                              : slittingSelectedWo
                    const routing = selectedWo?.itemRouting ?? []
                    return (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-2 -ml-2 shrink-0"
                      onClick={() => {
                        if (floorView === "printing") setPrintingSelectedWo(null)
                        else if (floorView === "inspection") setInspectionSelectedWo(null)
                        else if (floorView === "ecl") setEclSelectedWo(null)
                        else if (floorView === "lamination") setLaminationSelectedWo(null)
                        else if (floorView === "slitting") setSlittingSelectedWo(null)
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Work Order - #
                      {selectedWo?.woNumber ?? String(selectedWo?.id ?? "")}
                    </Button>
                    <div
                      className="self-stretch w-px bg-gray-300 dark:bg-gray-600 shrink-0"
                      aria-hidden
                    />
                    <div className="space-y-0.5 text-left min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customer — {selectedWo?.partyName ?? "—"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Variety — {selectedWo?.itemName ?? "—"}
                      </p>
                    </div>
                    <div
                      className="self-stretch w-px bg-gray-300 dark:bg-gray-600 shrink-0"
                      aria-hidden
                    />
                    <div className="space-y-0.5 text-left min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Routing</p>
                      {routing.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400">—</p>
                      ) : (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {routing
                            .map((step) => `${step.sno} ${step.operation}`)
                            .join(" → ")}
                        </p>
                      )}
                    </div>
                  </div>
                    )
                  })()
                ) : null}
                {floorView === "printing" ? (
                  <PrintingPanel
                    printingSelectedWo={printingSelectedWo}
                    printingRollsLoading={printingRollsLoading}
                    printingLoadedRolls={printingLoadedRolls}
                    setPrintingLoadedRolls={setPrintingLoadedRolls}
                    printingCreateChildLoading={printingCreateChildLoading}
                    setPrintingCreateChildLoading={setPrintingCreateChildLoading}
                    setPrintingCreateChildMessage={setPrintingCreateChildMessage}
                    getRollsStockById={getRollsStockById}
                    setPrintingAddRollEditingField={setPrintingAddRollEditingField}
                    scaleWeight={scaleWeight}
                    setPrintingAddRollForm={setPrintingAddRollForm}
                    printingAddRollForm={printingAddRollForm}
                    printingChildRollsLoading={printingChildRollsLoading}
                    printingProducedTotals={printingProducedTotals}
                    printingChildRollsFromDb={printingChildRollsFromDb}
                    printingProducedRollColumns={printingProducedRollColumns}
                    printingFormCommittedForRollId={printingFormCommittedForRollId}
                    wipPrintingTemplate={wipPrintingTemplate}
                    createPrintJob={createPrintJob}
                    getPrintJob={getPrintJob}
                    setPrintingPrintStatus={setPrintingPrintStatus}
                    addPrintedRoll={addPrintedRoll}
                    setPrintingFormCommittedForRollId={setPrintingFormCommittedForRollId}
                    getRollsStockByWorkOrder={getRollsStockByWorkOrder}
                    setPrintingChildRollsFromDb={setPrintingChildRollsFromDb}
                    updateRollsStock={updateRollsStock}
                    setPrintingSelectedWo={setPrintingSelectedWo}
                    updateWorkOrder={updateWorkOrder}
                    setPrintingWorkOrders={setPrintingWorkOrders}
                    printingCreateChildMessage={printingCreateChildMessage}
                    printingLoading={printingLoading}
                    printingError={printingError}
                    printingWorkOrders={printingWorkOrders}
                    unloadFloorLoadedRoll={unloadFloorLoadedRoll}
                    floorPrintingBarcode={floorPrintingBarcode}
                    setFloorPrintingBarcode={setFloorPrintingBarcode}
                    floorPrintingBarcodeError={floorPrintingBarcodeError}
                    setFloorPrintingBarcodeError={setFloorPrintingBarcodeError}
                    floorPrintingBarcodeChecking={floorPrintingBarcodeChecking}
                    handleFloorPrintingBarcodeSubmit={handleFloorPrintingBarcodeSubmit}
                    floorPrintingRmPickerOpen={floorPrintingRmPickerOpen}
                    floorPrintingRmRolls={floorPrintingRmRolls}
                    floorPrintingRmRollsLoading={floorPrintingRmRollsLoading}
                    floorPrintingRmRollsError={floorPrintingRmRollsError}
                    floorPrintingRmStockColumns={floorPrintingRmStockColumns}
                    openFloorPrintingRmPicker={openFloorPrintingRmPicker}
                    closeFloorPrintingRmPicker={closeFloorPrintingRmPicker}
                    applyFloorPrintingFromBarcode={applyFloorPrintingFromBarcode}
                    setPrintingRollsRefreshKey={setPrintingRollsRefreshKey}
                  />
                ) : floorView === "inspection" ? (
                  <InspectionPanel
                    inspectionSelectedWo={inspectionSelectedWo}
                    inspectionRollsLoading={inspectionRollsLoading}
                    inspectionLoadedRolls={inspectionLoadedRolls}
                    setInspectionLoadedRolls={setInspectionLoadedRolls}
                    inspectionAddRollForm={inspectionAddRollForm}
                    inspectionCreateChildLoading={inspectionCreateChildLoading}
                    setInspectionCreateChildLoading={setInspectionCreateChildLoading}
                    setInspectionCreateChildMessage={setInspectionCreateChildMessage}
                    getRollsStockById={getRollsStockById}
                    setInspectionAddRollEditingField={setInspectionAddRollEditingField}
                    scaleWeight={scaleWeight}
                    setInspectionAddRollForm={setInspectionAddRollForm}
                    inspectionChildRollsLoading={inspectionChildRollsLoading}
                    inspectionChildRollsFromDb={inspectionChildRollsFromDb}
                    wipPrintingTemplate={wipPrintingTemplate}
                    createPrintJob={createPrintJob}
                    getPrintJob={getPrintJob}
                    setPrintingPrintStatus={setPrintingPrintStatus}
                    inspectionFormCommittedForRollId={inspectionFormCommittedForRollId}
                    inspectionAddRollEditingField={inspectionAddRollEditingField}
                    addInspectionRoll={addInspectionRoll}
                    setInspectionFormCommittedForRollId={setInspectionFormCommittedForRollId}
                    setInspectionChildRollsFromDb={setInspectionChildRollsFromDb}
                    updateRollsStock={updateRollsStock}
                    setInspectionRollsRefreshKey={setInspectionRollsRefreshKey}
                    inspectionCreateChildMessage={inspectionCreateChildMessage}
                    floorInspectionBarcode={floorInspectionBarcode}
                    setFloorInspectionBarcode={setFloorInspectionBarcode}
                    setFloorInspectionBarcodeError={setFloorInspectionBarcodeError}
                    floorInspectionBarcodeChecking={floorInspectionBarcodeChecking}
                    handleFloorInspectionBarcodeSubmit={handleFloorInspectionBarcodeSubmit}
                    floorInspectionWipRollsLoading={floorInspectionWipRollsLoading}
                    openFloorInspectionWipPicker={openFloorInspectionWipPicker}
                    floorInspectionBarcodeError={floorInspectionBarcodeError}
                    floorInspectionWipPickerOpen={floorInspectionWipPickerOpen}
                    closeFloorInspectionWipPicker={closeFloorInspectionWipPicker}
                    floorInspectionWipRollsError={floorInspectionWipRollsError}
                    floorInspectionWipStockColumns={floorInspectionWipStockColumns}
                    floorInspectionWipRolls={floorInspectionWipRolls}
                    applyFloorInspectionFromBarcode={applyFloorInspectionFromBarcode}
                    inspectionLoading={inspectionLoading}
                    inspectionError={inspectionError}
                    inspectionWorkOrders={inspectionWorkOrders}
                    setInspectionSelectedWo={setInspectionSelectedWo}
                    getRollsStockByWorkOrder={getRollsStockByWorkOrder}
                    unloadFloorLoadedRoll={unloadFloorLoadedRoll}
                    onSkipWorkOrder={skipInspectionWorkOrder}
                  />
                ) : floorView === "ecl" ? (
                  <EclPanel
                    eclSelectedWo={eclSelectedWo}
                    eclRollsLoading={eclRollsLoading}
                    eclLoadedRolls={eclLoadedRolls}
                    eclAddRollForm={eclAddRollForm}
                    eclCreateChildLoading={eclCreateChildLoading}
                    setEclCreateChildLoading={setEclCreateChildLoading}
                    setEclCreateChildMessage={setEclCreateChildMessage}
                    getRollsStockById={getRollsStockById}
                    setEclAddRollEditingField={setEclAddRollEditingField}
                    scaleWeight={scaleWeight}
                    setEclAddRollForm={setEclAddRollForm}
                    eclChildRollsLoading={eclChildRollsLoading}
                    eclChildRollsFromDb={eclChildRollsFromDb}
                    wipPrintingTemplate={wipPrintingTemplate}
                    createPrintJob={createPrintJob}
                    getPrintJob={getPrintJob}
                    setPrintingPrintStatus={setPrintingPrintStatus}
                    eclFormCommittedForRollId={eclFormCommittedForRollId}
                    eclAddRollEditingField={eclAddRollEditingField}
                    addEclRoll={addEclRoll}
                    setEclFormCommittedForRollId={setEclFormCommittedForRollId}
                    setEclChildRollsFromDb={setEclChildRollsFromDb}
                    eclCreateChildMessage={eclCreateChildMessage}
                    floorEclBarcode={floorEclBarcode}
                    setFloorEclBarcode={setFloorEclBarcode}
                    setFloorEclBarcodeError={setFloorEclBarcodeError}
                    floorEclBarcodeChecking={floorEclBarcodeChecking}
                    handleFloorEclBarcodeSubmit={handleFloorEclBarcodeSubmit}
                    floorEclWipRollsLoading={floorEclWipRollsLoading}
                    openFloorEclWipPicker={openFloorEclWipPicker}
                    floorEclBarcodeError={floorEclBarcodeError}
                    floorEclWipPickerOpen={floorEclWipPickerOpen}
                    closeFloorEclWipPicker={closeFloorEclWipPicker}
                    floorEclWipRollsError={floorEclWipRollsError}
                    floorEclWipStockColumns={floorEclWipStockColumns}
                    floorEclWipRolls={floorEclWipRolls}
                    floorEclRmPickerOpen={floorEclRmPickerOpen}
                    closeFloorEclRmPicker={closeFloorEclRmPicker}
                    floorEclRmRollsLoading={floorEclRmRollsLoading}
                    floorEclRmRollsError={floorEclRmRollsError}
                    floorEclRmStockColumns={floorEclRmStockColumns}
                    floorEclRmRolls={floorEclRmRolls}
                    openFloorEclRmPicker={openFloorEclRmPicker}
                    floorEclDetailWipBarcode={floorEclDetailWipBarcode}
                    setFloorEclDetailWipBarcode={setFloorEclDetailWipBarcode}
                    floorEclDetailRmBarcode={floorEclDetailRmBarcode}
                    setFloorEclDetailRmBarcode={setFloorEclDetailRmBarcode}
                    applyFloorEclFromBarcode={applyFloorEclFromBarcode}
                    getEclParentRole={getEclParentRole}
                    eclLoading={eclLoading}
                    eclError={eclError}
                    eclWorkOrders={eclWorkOrders}
                    setEclSelectedWo={setEclSelectedWo}
                    getRollsStockByParentIds={getRollsStockByParentIds}
                    unloadFloorLoadedRoll={unloadFloorLoadedRoll}
                    onSkipWorkOrder={skipEclWorkOrder}
                  />
                ) : floorView === "lamination" ? (
                  <LaminationPanel
                    laminationSelectedWo={laminationSelectedWo}
                    laminationRollsLoading={laminationRollsLoading}
                    laminationLoadedRolls={laminationLoadedRolls}
                    laminationAddRollForm={laminationAddRollForm}
                    laminationCreateChildLoading={laminationCreateChildLoading}
                    setLaminationCreateChildLoading={setLaminationCreateChildLoading}
                    setLaminationCreateChildMessage={setLaminationCreateChildMessage}
                    getRollsStockById={getRollsStockById}
                    setLaminationAddRollEditingField={setLaminationAddRollEditingField}
                    scaleWeight={scaleWeight}
                    setLaminationAddRollForm={setLaminationAddRollForm}
                    laminationChildRollsLoading={laminationChildRollsLoading}
                    laminationChildRollsFromDb={laminationChildRollsFromDb}
                    wipPrintingTemplate={wipPrintingTemplate}
                    createPrintJob={createPrintJob}
                    getPrintJob={getPrintJob}
                    setPrintingPrintStatus={setPrintingPrintStatus}
                    laminationFormCommittedForRollId={laminationFormCommittedForRollId}
                    laminationAddRollEditingField={laminationAddRollEditingField}
                    addLaminationRoll={addLaminationRoll}
                    setLaminationFormCommittedForRollId={setLaminationFormCommittedForRollId}
                    setLaminationChildRollsFromDb={setLaminationChildRollsFromDb}
                    laminationCreateChildMessage={laminationCreateChildMessage}
                    floorLaminationBarcode={floorLaminationBarcode}
                    setFloorLaminationBarcode={setFloorLaminationBarcode}
                    setFloorLaminationBarcodeError={setFloorLaminationBarcodeError}
                    floorLaminationBarcodeChecking={floorLaminationBarcodeChecking}
                    handleFloorLaminationBarcodeSubmit={handleFloorLaminationBarcodeSubmit}
                    floorLaminationWipRollsLoading={floorLaminationWipRollsLoading}
                    openFloorLaminationWipPicker={openFloorLaminationWipPicker}
                    floorLaminationBarcodeError={floorLaminationBarcodeError}
                    floorLaminationWipPickerOpen={floorLaminationWipPickerOpen}
                    closeFloorLaminationWipPicker={closeFloorLaminationWipPicker}
                    floorLaminationWipRollsError={floorLaminationWipRollsError}
                    floorLaminationWipStockColumns={floorLaminationWipStockColumns}
                    floorLaminationWipRolls={floorLaminationWipRolls}
                    floorLaminationRmPickerOpen={floorLaminationRmPickerOpen}
                    closeFloorLaminationRmPicker={closeFloorLaminationRmPicker}
                    floorLaminationRmRollsLoading={floorLaminationRmRollsLoading}
                    floorLaminationRmRollsError={floorLaminationRmRollsError}
                    floorLaminationRmStockColumns={floorLaminationRmStockColumns}
                    floorLaminationRmRolls={floorLaminationRmRolls}
                    openFloorLaminationRmPicker={openFloorLaminationRmPicker}
                    floorLaminationDetailWipBarcode={floorLaminationDetailWipBarcode}
                    setFloorLaminationDetailWipBarcode={setFloorLaminationDetailWipBarcode}
                    floorLaminationDetailRmBarcode={floorLaminationDetailRmBarcode}
                    setFloorLaminationDetailRmBarcode={setFloorLaminationDetailRmBarcode}
                    applyFloorLaminationFromBarcode={applyFloorLaminationFromBarcode}
                    getLaminationParentRole={getLaminationParentRole}
                    laminationLoading={laminationLoading}
                    laminationError={laminationError}
                    laminationWorkOrders={laminationWorkOrders}
                    setLaminationSelectedWo={setLaminationSelectedWo}
                    getRollsStockByParentIds={getRollsStockByParentIds}
                    unloadFloorLoadedRoll={unloadFloorLoadedRoll}
                    onSkipWorkOrder={skipLaminationWorkOrder}
                  />
                ) : floorView === "slitting" ? (
                  <SlittingPanel
                    slittingSelectedWo={slittingSelectedWo}
                    slittingRollsLoading={slittingRollsLoading}
                    slittingLoadedRolls={slittingLoadedRolls}
                    slittingAddRollForm={slittingAddRollForm}
                    setSlittingAddRollForm={setSlittingAddRollForm}
                    slittingCreateChildLoading={slittingCreateChildLoading}
                    setSlittingCreateChildLoading={setSlittingCreateChildLoading}
                    setSlittingCreateChildMessage={setSlittingCreateChildMessage}
                    setSlittingAddRollEditingField={setSlittingAddRollEditingField}
                    slittingAddRollEditingField={slittingAddRollEditingField}
                    slittingChildRollsLoading={slittingChildRollsLoading}
                    slittingChildRollsFromDb={slittingChildRollsFromDb}
                    setSlittingChildRollsFromDb={setSlittingChildRollsFromDb}
                    wipPrintingTemplate={wipPrintingTemplate}
                    createPrintJob={createPrintJob}
                    getPrintJob={getPrintJob}
                    setPrintingPrintStatus={setPrintingPrintStatus}
                    addSlittingRoll={addSlittingRoll}
                    slittingCreateChildMessage={slittingCreateChildMessage}
                    floorSlittingBarcode={floorSlittingBarcode}
                    setFloorSlittingBarcode={setFloorSlittingBarcode}
                    setFloorSlittingBarcodeError={setFloorSlittingBarcodeError}
                    floorSlittingBarcodeChecking={floorSlittingBarcodeChecking}
                    handleFloorSlittingBarcodeSubmit={handleFloorSlittingBarcodeSubmit}
                    floorSlittingParentRollsLoading={floorSlittingParentRollsLoading}
                    openFloorSlittingParentPicker={openFloorSlittingParentPicker}
                    floorSlittingBarcodeError={floorSlittingBarcodeError}
                    floorSlittingParentPickerOpen={floorSlittingParentPickerOpen}
                    closeFloorSlittingParentPicker={closeFloorSlittingParentPicker}
                    floorSlittingParentRollsError={floorSlittingParentRollsError}
                    floorSlittingParentStockColumns={floorSlittingParentStockColumns}
                    floorSlittingParentRolls={floorSlittingParentRolls}
                    applyFloorSlittingFromBarcode={applyFloorSlittingFromBarcode}
                    slittingLoading={slittingLoading}
                    slittingError={slittingError}
                    slittingWorkOrders={slittingWorkOrders}
                    setSlittingSelectedWo={setSlittingSelectedWo}
                    getRollsStockByParentIds={getRollsStockByParentIds}
                    unloadFloorLoadedRoll={unloadFloorLoadedRoll}
                    onSkipWorkOrder={skipSlittingWorkOrder}
                    setSlittingRollsRefreshKey={setSlittingRollsRefreshKey}
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Select a department to continue.
                  </p>
                )}
            </div>
          )}
      </FloorShell>
    )
  }

  if (isStockUser) {
    return <StockDashboard onNavigate={navigate} />
  }

  return <GeneralDashboard isPrintingUser={isPrintingUser} onNavigate={navigate} />
}
