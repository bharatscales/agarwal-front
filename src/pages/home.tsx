import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Printer,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useSidebar } from "@/components/ui/sidebar"
import { ColumnHeader } from "@/components/column-header"
import { getRollsStockColumns, type RollsStockRow } from "@/components/columns/rolls-stock-columns"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import {
  addEclRoll,
  addInspectionRoll,
  addLaminationRoll,
  addPrintedRoll,
  addSlittingRoll,
  getAllJobCards,
  getCurrentRoll,
  type CurrentRoll,
} from "@/lib/job-card-api"
import { getAllWorkOrders, updateWorkOrder } from "@/lib/work-order-api"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import {
  getRollsStockById,
  updateRollsStock,
  getRollsStockByParentIds,
  getRollsStockByWorkOrder,
  getRollByBarcode,
  getWorkOrderByRollBarcode,
  getAllRollsStock,
} from "@/lib/rolls-stock-api"
import { getAllTemplates, type TemplateMaster } from "@/lib/template-api"
import { createPrintJob, getPrintJob } from "@/lib/print-job-api"
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
    parent: { gradeId?: number }
    size: string
    micron: string
    netweight: string
    grossweight: string
    wastage: string
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

  // Floor Inspection (mirror of Floor Printing)
  const [inspectionWorkOrders, setInspectionWorkOrders] = useState<WorkOrderMaster[]>([])
  const [inspectionLoading, setInspectionLoading] = useState(false)
  const [inspectionError, setInspectionError] = useState<string | null>(null)
  const [inspectionSelectedWo, setInspectionSelectedWo] = useState<WorkOrderMaster | null>(null)
  const [inspectionRollsLoading, setInspectionRollsLoading] = useState(false)
  const [inspectionLoadedRolls, setInspectionLoadedRolls] = useState<
    { jobCardNumber: string; jobCardId: number; roll: CurrentRoll }[]
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
    grossweight: string
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
          grossweight: r.grossweight,
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
      {
        accessorKey: "size",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Size" column={column} placeholder="Filter size..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.size != null ? String(row.original.size) : "-"}</div>
        ),
      },
      {
        accessorKey: "micron",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Micron" column={column} placeholder="Filter micron..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">{row.original.micron != null ? String(row.original.micron) : "-"}</div>
        ),
      },
      {
        accessorKey: "netweight",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Net weight (kg)" column={column} placeholder="Filter net weight..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.netweight != null ? `${Number(row.original.netweight).toFixed(2)} kg` : "-"}
          </div>
        ),
      },
      {
        accessorKey: "wastage",
        header: ({ column }: { column: any }) => (
          <ColumnHeader title="Wastage (kg)" column={column} placeholder="Filter wastage..." />
        ),
        cell: ({ row }: { row: any }) => (
          <div className="text-sm">
            {row.original.wastage != null ? `${Number(row.original.wastage).toFixed(2)} kg` : "-"}
          </div>
        ),
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
        acc.netWastage += Number(row.wastage || 0)
        return acc
      },
      { rollCount: 0, netWeight: 0, netWastage: 0 }
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

  // Floor Lamination (mirror of Inspection)
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

  // Floor Slitting (mirror of Inspection)
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
  const [slittingFormCommittedForRollId, setSlittingFormCommittedForRollId] = useState<number | null>(null)

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
    if (!barcode) return
    setFloorInspectionBarcodeError(null)
    setFloorInspectionBarcodeChecking(true)
    try {
      const roll = await getRollByBarcode(barcode)
      if (!roll) {
        setFloorInspectionBarcodeError("Roll not found for this barcode.")
        return
      }
      const woInfo = await getWorkOrderByRollBarcode(barcode)
      if (!woInfo) {
        setFloorInspectionBarcodeError(
          "No work order linked to this roll (roll must come from a production job card)."
        )
        return
      }
      // The table only lists WOs that already have a roll loaded on Inspection; picking a WIP printing roll
      // usually targets a WO that is not in that subset yet — resolve the WO from the full list.
      let wo = inspectionWorkOrders.find((w) => w.id === woInfo.workOrderId)
      if (!wo) {
        try {
          const allWos = await getAllWorkOrders(0, 500)
          wo = allWos.find((w) => w.id === woInfo.workOrderId)
        } catch {
          wo = undefined
        }
      }
      if (!wo) {
        setFloorInspectionBarcodeError("Work order not found for this roll.")
        return
      }
      setFloorInspectionBarcode("")
      setInspectionSelectedWo(wo)
      if (options?.closePicker) closeFloorInspectionWipPicker()
    } catch {
      setFloorInspectionBarcodeError("Could not look up roll. Try again.")
    } finally {
      setFloorInspectionBarcodeChecking(false)
    }
  }

  const handleFloorInspectionBarcodeSubmit = async () => {
    await applyFloorInspectionFromBarcode(floorInspectionBarcode)
  }

  const openFloorInspectionWipPicker = async () => {
    setFloorInspectionWipPickerOpen(true)
    setFloorInspectionWipRollsLoading(true)
    setFloorInspectionWipRollsError(null)
    setFloorInspectionWipRolls([])
    try {
      const rolls = await getAllRollsStock(0, 500, false, "wip_printed")
      const filtered = rolls.filter((r) => !r.consumed)
      setFloorInspectionWipRolls(filtered as RollsStockRow[])
      if (filtered.length === 0) {
        setFloorInspectionWipRollsError(
          "No available WIP printing rolls found. Try scanning a barcode instead."
        )
      }
    } catch {
      setFloorInspectionWipRollsError("Failed to load stock. Please try again.")
      setFloorInspectionWipRolls([])
    } finally {
      setFloorInspectionWipRollsLoading(false)
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

  // Floor Inspection page: work orders linked to available WIP Printing rolls
  useEffect(() => {
    if (!isFloorUser || floorView !== "inspection") return
    let cancelled = false
    const run = async () => {
      setInspectionLoading(true)
      setInspectionError(null)
      try {
        const wipPrintingRolls = await getAllRollsStock(0, 500, false, "wip_printed")
        const workOrderIdsWithWipRoll = new Set<number>()
        const BATCH = 15
        for (let i = 0; i < wipPrintingRolls.length; i += BATCH) {
          if (cancelled) return
          const batch = wipPrintingRolls.slice(i, i + BATCH)
          const results = await Promise.all(
            batch.map(async (roll) => {
              try {
                const barcode = roll.barcode?.trim()
                if (!barcode) return { workOrderId: null, hasWorkOrder: false }
                const woInfo = await getWorkOrderByRollBarcode(barcode)
                return { workOrderId: woInfo?.workOrderId ?? null, hasWorkOrder: woInfo != null }
              } catch {
                return { workOrderId: null, hasWorkOrder: false }
              }
            })
          )
          results.forEach((r) => {
            if (r.hasWorkOrder && r.workOrderId != null) workOrderIdsWithWipRoll.add(r.workOrderId)
          })
        }
        if (cancelled) return
        const allWos = await getAllWorkOrders(0, 500)
        const filtered = allWos.filter(
          (wo) =>
            workOrderIdsWithWipRoll.has(wo.id) &&
            wo.status !== "completed" &&
            wo.status !== "cancelled"
        )
        if (!cancelled) setInspectionWorkOrders(filtered)
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
  }, [isFloorUser, floorView])

  // Floor ECL: work orders that have an ECL job card with current loaded roll
  useEffect(() => {
    if (!isFloorUser || floorView !== "ecl") return
    let cancelled = false
    const run = async () => {
      setEclLoading(true)
      setEclError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "ECL")
        const workOrderIdsWithRoll = new Set<number>()
        const BATCH = 15
        for (let i = 0; i < cards.length; i += BATCH) {
          if (cancelled) return
          const batch = cards.slice(i, i + BATCH)
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
            if (r.hasRoll) workOrderIdsWithRoll.add(r.workOrderId)
          })
        }
        if (cancelled) return
        const allWos = await getAllWorkOrders(0, 500)
        const filtered = allWos.filter((wo) => workOrderIdsWithRoll.has(wo.id))
        if (!cancelled) setEclWorkOrders(filtered)
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
  }, [isFloorUser, floorView])

  // Floor Lamination: work orders that have a Lamination job card with current loaded roll
  useEffect(() => {
    if (!isFloorUser || floorView !== "lamination") return
    let cancelled = false
    const run = async () => {
      setLaminationLoading(true)
      setLaminationError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "Lamination")
        const workOrderIdsWithRoll = new Set<number>()
        const BATCH = 15
        for (let i = 0; i < cards.length; i += BATCH) {
          if (cancelled) return
          const batch = cards.slice(i, i + BATCH)
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
            if (r.hasRoll) workOrderIdsWithRoll.add(r.workOrderId)
          })
        }
        if (cancelled) return
        const allWos = await getAllWorkOrders(0, 500)
        const filtered = allWos.filter((wo) => workOrderIdsWithRoll.has(wo.id))
        if (!cancelled) setLaminationWorkOrders(filtered)
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
  }, [isFloorUser, floorView])

  // Floor Slitting: work orders that have a Slitting job card with current loaded roll
  useEffect(() => {
    if (!isFloorUser || floorView !== "slitting") return
    let cancelled = false
    const run = async () => {
      setSlittingLoading(true)
      setSlittingError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "Slitting")
        const workOrderIdsWithRoll = new Set<number>()
        const BATCH = 15
        for (let i = 0; i < cards.length; i += BATCH) {
          if (cancelled) return
          const batch = cards.slice(i, i + BATCH)
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
            if (r.hasRoll) workOrderIdsWithRoll.add(r.workOrderId)
          })
        }
        if (cancelled) return
        const allWos = await getAllWorkOrders(0, 500)
        const filtered = allWos.filter((wo) => workOrderIdsWithRoll.has(wo.id))
        if (!cancelled) setSlittingWorkOrders(filtered)
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
  }, [isFloorUser, floorView])

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
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                setPrintingAddRollEditingField(null)
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setPrintingAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                  grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (first.roll.netweight != null ? String(first.roll.netweight) : "")),
                  wastage: parent.wastage != null ? String(parent.wastage) : "0",
                })
              }
            } catch {
              if (!cancelled) {
                setPrintingAddRollForm(null)
                setPrintingAddRollEditingField(null)
              }
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
  }, [printingSelectedWo?.id])

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
          const loaded = results.filter((r): r is { jobCardNumber: string; jobCardId: number; roll: CurrentRoll } => r.roll != null)
          setInspectionLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                setInspectionAddRollEditingField(null)
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setInspectionAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                  grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (first.roll.netweight != null ? String(first.roll.netweight) : "")),
                })
              }
            } catch {
              if (!cancelled) {
                setInspectionAddRollForm(null)
                setInspectionAddRollEditingField(null)
              }
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
  }, [inspectionSelectedWo?.id])

  // When Floor user selects a work order in ECL section, fetch loaded roll(s) and show form
  useEffect(() => {
    if (!eclSelectedWo) {
      setEclLoadedRolls([])
      setEclAddRollForm(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setEclRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, eclSelectedWo.id, "ECL")
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
          setEclLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setEclAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                  grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (first.roll.netweight != null ? String(first.roll.netweight) : "")),
                })
              }
            } catch {
              if (!cancelled) setEclAddRollForm(null)
            }
          } else setEclAddRollForm(null)
        }
      } catch {
        if (!cancelled) {
          setEclLoadedRolls([])
          setEclAddRollForm(null)
        }
      } finally {
        if (!cancelled) setEclRollsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [eclSelectedWo?.id])

  // When Floor user selects a work order in Lamination section, fetch loaded roll(s) and show form
  useEffect(() => {
    if (!laminationSelectedWo) {
      setLaminationLoadedRolls([])
      setLaminationAddRollForm(null)
      return
    }
    let cancelled = false
    const run = async () => {
      setLaminationRollsLoading(true)
      try {
        const cards = await getAllJobCards(0, 20, laminationSelectedWo.id, "Lamination")
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
          setLaminationLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setLaminationAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                  grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (first.roll.netweight != null ? String(first.roll.netweight) : "")),
                })
              }
            } catch {
              if (!cancelled) setLaminationAddRollForm(null)
            }
          } else setLaminationAddRollForm(null)
        }
      } catch {
        if (!cancelled) {
          setLaminationLoadedRolls([])
          setLaminationAddRollForm(null)
        }
      } finally {
        if (!cancelled) setLaminationRollsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [laminationSelectedWo?.id])

  // When Floor user selects a work order in Slitting section, fetch loaded roll(s) and show form
  useEffect(() => {
    if (!slittingSelectedWo) {
      setSlittingLoadedRolls([])
      setSlittingAddRollForm(null)
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
              const roll = await getCurrentRoll(c.id)
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll }
            } catch {
              return { jobCardNumber: c.jobCardNumber, jobCardId: c.id, roll: null }
            }
          })
        )
        if (!cancelled) {
          const loaded = results.filter((r): r is { jobCardNumber: string; jobCardId: number; roll: CurrentRoll } => r.roll != null)
          setSlittingLoadedRolls(loaded)
          if (loaded.length > 0) {
            const first = loaded[0]
            try {
              const parent = await getRollsStockById(first.roll.id)
              if (!cancelled) {
                const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                setSlittingAddRollForm({
                  jobCardNumber: first.jobCardNumber,
                  jobCardId: first.jobCardId,
                  roll: first.roll,
                  parent: { gradeId: parent.gradeId },
                  size: first.roll.size != null ? String(first.roll.size) : "",
                  micron: first.roll.micron != null ? String(first.roll.micron) : "",
                  netweight: first.roll.netweight != null ? String(first.roll.netweight) : "",
                  grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (first.roll.netweight != null ? String(first.roll.netweight) : "")),
                })
              }
            } catch {
              if (!cancelled) setSlittingAddRollForm(null)
            }
          } else setSlittingAddRollForm(null)
        }
      } catch {
        if (!cancelled) {
          setSlittingLoadedRolls([])
          setSlittingAddRollForm(null)
        }
      } finally {
        if (!cancelled) setSlittingRollsLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [slittingSelectedWo?.id])

  // Reset committed state and child rolls when switching work order
  useEffect(() => {
    setPrintingFormCommittedForRollId(null)
    setPrintingChildRollsFromDb([])
  }, [printingSelectedWo])

  // Reset inspection committed state and child rolls when switching work order
  useEffect(() => {
    setInspectionFormCommittedForRollId(null)
    setInspectionChildRollsFromDb([])
  }, [inspectionSelectedWo])

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

  // Fetch child rolls (WIP inspection) for loaded rolls in Inspection section
  useEffect(() => {
    if (inspectionLoadedRolls.length === 0) {
      setInspectionChildRollsFromDb([])
      return
    }
    const parentIds = inspectionLoadedRolls.map((r) => r.roll.id)
    let cancelled = false
    setInspectionChildRollsLoading(true)
    getRollsStockByParentIds(parentIds, "wip_inspection")
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
  }, [inspectionLoadedRolls])

  // Fetch WIP printing template when on Floor Printing view (for Print button)
  useEffect(() => {
    if (!isFloorUser || floorView !== "printing") return
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
      setInspectionAddRollForm((prev) =>
        prev ? { ...prev, grossweight: String(scaleWeight) } : null
      )
    }
  }, [scaleWeight])

  // Printing department: home screen is the Work Order screen
  if (isPrintingUser) {
    return <WorkOrder />
  }

  // Floor department: dedicated home (no Manufacturing menu) with title + printer status bars
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
                      {(floorView === "printing"
                        ? printingSelectedWo
                        : floorView === "inspection"
                          ? inspectionSelectedWo
                          : floorView === "ecl"
                            ? eclSelectedWo
                            : floorView === "lamination"
                              ? laminationSelectedWo
                              : slittingSelectedWo)?.woNumber ??
                        String(
                          (floorView === "printing"
                            ? printingSelectedWo
                            : floorView === "inspection"
                              ? inspectionSelectedWo
                              : floorView === "ecl"
                                ? eclSelectedWo
                                : floorView === "lamination"
                                  ? laminationSelectedWo
                                  : slittingSelectedWo)?.id ?? ""
                        )}
                    </Button>
                    <div
                      className="h-6 w-px bg-gray-300 dark:bg-gray-600 shrink-0"
                      aria-hidden
                    />
                    <div className="space-y-0.5 text-left min-w-0">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customer — {(floorView === "printing" ? printingSelectedWo : floorView === "inspection" ? inspectionSelectedWo : floorView === "ecl" ? eclSelectedWo : floorView === "lamination" ? laminationSelectedWo : slittingSelectedWo)?.partyName ?? "—"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Variety — {(floorView === "printing" ? printingSelectedWo : floorView === "inspection" ? inspectionSelectedWo : floorView === "ecl" ? eclSelectedWo : floorView === "lamination" ? laminationSelectedWo : slittingSelectedWo)?.itemName ?? "—"}
                      </p>
                    </div>
                  </div>
                ) : null}
                {floorView === "printing" ? (
                  <PrintingPanel
                    printingSelectedWo={printingSelectedWo}
                    printingRollsLoading={printingRollsLoading}
                    printingLoadedRolls={printingLoadedRolls}
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
                    setFloorView={setFloorView}
                    updateWorkOrder={updateWorkOrder}
                    setPrintingWorkOrders={setPrintingWorkOrders}
                    printingCreateChildMessage={printingCreateChildMessage}
                    printingLoading={printingLoading}
                    printingError={printingError}
                    printingWorkOrders={printingWorkOrders}
                  />
                ) : floorView === "inspection" ? (
                  <InspectionPanel
                    inspectionSelectedWo={inspectionSelectedWo}
                    inspectionRollsLoading={inspectionRollsLoading}
                    inspectionLoadedRolls={inspectionLoadedRolls}
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
                    getRollsStockByParentIds={getRollsStockByParentIds}
                  />
                ) : floorView === "ecl" ? (
                  <EclPanel
                    eclSelectedWo={eclSelectedWo}
                    eclRollsLoading={eclRollsLoading}
                    eclLoadedRolls={eclLoadedRolls}
                    eclAddRollForm={eclAddRollForm}
                    setEclAddRollForm={setEclAddRollForm}
                    eclCreateChildLoading={eclCreateChildLoading}
                    eclFormCommittedForRollId={eclFormCommittedForRollId}
                    setEclCreateChildLoading={setEclCreateChildLoading}
                    setEclCreateChildMessage={setEclCreateChildMessage}
                    addEclRoll={addEclRoll}
                    setEclFormCommittedForRollId={setEclFormCommittedForRollId}
                    eclCreateChildMessage={eclCreateChildMessage}
                    eclLoading={eclLoading}
                    eclError={eclError}
                    eclWorkOrders={eclWorkOrders}
                    setEclSelectedWo={setEclSelectedWo}
                  />
                ) : floorView === "lamination" ? (
                  <LaminationPanel
                    laminationSelectedWo={laminationSelectedWo}
                    laminationRollsLoading={laminationRollsLoading}
                    laminationLoadedRolls={laminationLoadedRolls}
                    laminationAddRollForm={laminationAddRollForm}
                    setLaminationAddRollForm={setLaminationAddRollForm}
                    laminationCreateChildLoading={laminationCreateChildLoading}
                    laminationFormCommittedForRollId={laminationFormCommittedForRollId}
                    setLaminationCreateChildLoading={setLaminationCreateChildLoading}
                    setLaminationCreateChildMessage={setLaminationCreateChildMessage}
                    addLaminationRoll={addLaminationRoll}
                    setLaminationFormCommittedForRollId={setLaminationFormCommittedForRollId}
                    laminationCreateChildMessage={laminationCreateChildMessage}
                    laminationLoading={laminationLoading}
                    laminationError={laminationError}
                    laminationWorkOrders={laminationWorkOrders}
                    setLaminationSelectedWo={setLaminationSelectedWo}
                  />
                ) : floorView === "slitting" ? (
                  <SlittingPanel
                    slittingSelectedWo={slittingSelectedWo}
                    slittingRollsLoading={slittingRollsLoading}
                    slittingLoadedRolls={slittingLoadedRolls}
                    slittingAddRollForm={slittingAddRollForm}
                    setSlittingAddRollForm={setSlittingAddRollForm}
                    slittingCreateChildLoading={slittingCreateChildLoading}
                    slittingFormCommittedForRollId={slittingFormCommittedForRollId}
                    setSlittingCreateChildLoading={setSlittingCreateChildLoading}
                    setSlittingCreateChildMessage={setSlittingCreateChildMessage}
                    addSlittingRoll={addSlittingRoll}
                    setSlittingFormCommittedForRollId={setSlittingFormCommittedForRollId}
                    slittingCreateChildMessage={slittingCreateChildMessage}
                    slittingLoading={slittingLoading}
                    slittingError={slittingError}
                    slittingWorkOrders={slittingWorkOrders}
                    setSlittingSelectedWo={setSlittingSelectedWo}
                  />
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {floorView === "lamination" && "Lamination department view. Add content here."}
                    {floorView === "ecl" && "ECL department view. Add content here."}
                    {floorView === "slitting" && "Slitting department view. Add content here."}
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
