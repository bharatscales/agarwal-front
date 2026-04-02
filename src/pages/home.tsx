import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Box,
  BarChart3,
  Check,
  CheckCircle,
  ClipboardCheck,
  Cylinder,
  Droplets,
  Factory,
  FlaskConical,
  Layers,
  Pencil,
  Plus,
  Printer,
  ScanBarcode,
  Scissors,
  StickyNote,
  Truck,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import api from "@/lib/axios"
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
import { getAllWorkOrders } from "@/lib/work-order-api"
import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import {
  getRollsStockById,
  updateRollsStock,
  getRollsStockByParentIds,
  getRollByBarcode,
  getWorkOrderByRollBarcode,
} from "@/lib/rolls-stock-api"
import { getAllTemplates, type TemplateMaster } from "@/lib/template-api"
import { createPrintJob, getPrintJob } from "@/lib/print-job-api"
import WorkOrder from "./work-order"

const homeActions = [
  { label: "Stock", icon: Box, path: "/manufacturing/stock-entry" },
  { label: "Work Order", icon: Factory, path: "/manufacturing/work-order" },
  { label: "Printing", icon: Printer },
  { label: "Inspection", icon: ClipboardCheck },
  { label: "ECL Department", icon: Factory },
  { label: "Laminations", icon: Layers },
  { label: "Slitter", icon: Scissors },
  { label: "Dispatch", icon: Truck },
]

// Floor department (role=user, department=Floor): blocks open in-place pages (title/bottom bar unchanged)
export type FloorDepartmentId = "printing" | "inspection" | "lamination" | "ecl" | "slitting"

const floorDepartmentBlocks: { id: FloorDepartmentId; label: string; icon: typeof Printer }[] = [
  { id: "printing", label: "Printing", icon: Printer },
  { id: "inspection", label: "Inspection", icon: ClipboardCheck },
  { id: "ecl", label: "ECL", icon: Factory },
  { id: "lamination", label: "Lamination", icon: Layers },
  { id: "slitting", label: "Slitting", icon: Scissors },
]

// RM report blocks matching sidebar Reports menu (for stock-department homepage)
const rmReportBlocks = [
  { label: "Rm Film Stock", icon: Cylinder, path: "/manufacturing/reports/stock" },
  { label: "Rm Film Issued", icon: Cylinder, path: "/manufacturing/reports/roll-issues" },
  { label: "Rm Ink Stock", icon: Droplets, path: "/manufacturing/reports/ink-stock" },
  { label: "Rm Ink Issued", icon: Droplets, path: "/manufacturing/reports/ink-issues" },
  { label: "Rm Adhesive Stock", icon: StickyNote, path: "/manufacturing/reports/adhesive-stock" },
  { label: "Rm Adhesive Issued", icon: StickyNote, path: "/manufacturing/reports/adhesive-issues" },
  { label: "Rm Chemical Stock", icon: FlaskConical, path: "/manufacturing/reports/chemical-stock" },
  { label: "Rm Chemical Issued", icon: FlaskConical, path: "/manufacturing/reports/chemical-issues" },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { state: sidebarState, isMobile } = useSidebar()
  const [printerName, setPrinterName] = useState<string>("")
  const [printerAvailable, setPrinterAvailable] = useState<boolean>(false)
  const [websocketConnected, setWebsocketConnected] = useState<boolean>(false)
  const [scaleWeight, setScaleWeight] = useState<number | null>(null)
  const [scaleWeightError, setScaleWeightError] = useState<string | null>(null)
  const [isSerialSupported] = useState(
    () => typeof navigator !== "undefined" && "serial" in navigator
  )
  const [isScaleConnecting, setIsScaleConnecting] = useState(false)
  const [isScaleConnected, setIsScaleConnected] = useState(false)
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
  } | null>(null)
  const [printingAddRollEditingField, setPrintingAddRollEditingField] = useState<
    null | "size" | "micron" | "netweight" | "grossweight"
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
    null | "size" | "micron" | "netweight" | "grossweight"
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

  const isStockUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "stock" || user?.department === "Stock")

  const isPrintingUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "printing" || user?.department === "Printing")

  const isFloorUser =
    user?.role === "user" &&
    (user?.department?.toLowerCase() === "floor" || user?.department === "Floor")

  const handleFloorInspectionBarcodeSubmit = async () => {
    const barcode = floorInspectionBarcode.trim()
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
      const wo = inspectionWorkOrders.find((w) => w.id === woInfo.workOrderId)
      if (!wo) {
        setFloorInspectionBarcodeError(
          "This work order is not in the list (no loaded inspection roll for it here)."
        )
        return
      }
      setFloorInspectionBarcode("")
      setInspectionSelectedWo(wo)
    } catch {
      setFloorInspectionBarcodeError("Could not look up roll. Try again.")
    } finally {
      setFloorInspectionBarcodeChecking(false)
    }
  }

  const fetchDefaultPrinter = async () => {
    try {
      const response = await api.get<{
        available: boolean
        name: string | null
        device_id: string | null
        websocket_connected: boolean
      }>("/printer/default/zpl/status")
      if (response.data.available && response.data.name) {
        setPrinterName(response.data.name)
        setPrinterAvailable(true)
        setWebsocketConnected(response.data.websocket_connected)
      } else {
        setPrinterName("Not available")
        setPrinterAvailable(false)
        setWebsocketConnected(false)
      }
    } catch {
      setPrinterName("Not available")
      setPrinterAvailable(false)
      setWebsocketConnected(false)
    }
  }

  useEffect(() => {
    if (!isFloorUser) return
    fetchDefaultPrinter()
    const interval = setInterval(fetchDefaultPrinter, 5000)
    return () => clearInterval(interval)
  }, [isFloorUser])

  // Floor Printing page: work orders that have a Printing job card with current loaded roll
  useEffect(() => {
    if (!isFloorUser || floorView !== "printing") return
    let cancelled = false
    const run = async () => {
      setPrintingLoading(true)
      setPrintingError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "Printing")
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

  // Floor Inspection page: work orders that have an Inspection job card with current loaded roll
  useEffect(() => {
    if (!isFloorUser || floorView !== "inspection") return
    let cancelled = false
    const run = async () => {
      setInspectionLoading(true)
      setInspectionError(null)
      try {
        const cards = await getAllJobCards(0, 500, undefined, "Inspection")
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

  // Fetch child rolls (WIP printed) for consumed/loaded rolls from DB so table survives refresh
  useEffect(() => {
    if (printingLoadedRolls.length === 0) {
      setPrintingChildRollsFromDb([])
      return
    }
    const parentIds = printingLoadedRolls.map((r) => r.roll.id)
    let cancelled = false
    setPrintingChildRollsLoading(true)
    getRollsStockByParentIds(parentIds, "wip_printed")
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
  }, [printingLoadedRolls])

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

  const connectScale = async () => {
    if (!isSerialSupported) {
      setScaleWeight(null)
      setScaleWeightError("Not supported")
      return
    }
    try {
      setIsScaleConnecting(true)
      setScaleWeightError(null)
      // Web Serial API – works in Chromium browsers on secure origins.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const port = await (navigator as any).serial.requestPort()
      await port.open({ baudRate: 9600 })

      setIsScaleConnecting(false)
      setIsScaleConnected(true)

      const textDecoder = new TextDecoderStream()
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable)
      const reader = textDecoder.readable.getReader()

      ;(async () => {
        try {
          // Continuous read loop
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { value, done } = await reader.read()
            if (done) break
            if (!value) continue

            const text = String(value).trim()
            const match = text.match(/-?\d+(\.\d+)?/)
            if (match) {
              const parsed = parseFloat(match[0])
              if (!Number.isNaN(parsed)) {
                setScaleWeight(parsed)
              }
            }
          }
        } catch (err) {
          setScaleWeight(null)
          if (err instanceof Error && err.name === "AbortError") {
            // Ignore abort
          } else {
            setScaleWeightError("Read error")
          }
        } finally {
          setIsScaleConnected(false)
          try {
            reader.releaseLock()
            await readableStreamClosed
            await port.close()
          } catch {
            // ignore close errors
          }
        }
      })()
    } catch (err) {
      setIsScaleConnecting(false)
      setIsScaleConnected(false)
      setScaleWeight(null)
      setScaleWeightError(err instanceof Error ? err.message : "Connection failed")
    }
  }

  // Printing department: home screen is the Work Order screen
  if (isPrintingUser) {
    return <WorkOrder />
  }

  // Floor department: dedicated home (no Manufacturing menu) with title + printer status bars
  if (isFloorUser) {
    return (
      <div className="pt-16 pb-10">
        {/* Title bar fixed at top */}
        <div
          className="fixed top-0 h-16 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-50 transition-all duration-200"
          style={{
            left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
            right: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Floor Dashboard
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Welcome, {user?.username ?? "User"}.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Weight window: Connect inside when not connected; value only when connected */}
            <div className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 min-w-[130px] text-center flex flex-col items-center justify-center gap-1">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium">
                Weight
              </div>
              {isScaleConnected || isScaleConnecting ? (
                <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
                  {scaleWeightError
                    ? scaleWeightError
                    : scaleWeight != null
                      ? `${Number(scaleWeight).toFixed(2)} kg`
                      : "…"}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  className="h-8 min-w-[90px] px-3 text-xs font-semibold"
                  onClick={connectScale}
                  disabled={!isSerialSupported || isScaleConnecting}
                >
                  {!isSerialSupported ? "No Serial" : "Connect"}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pt-4 pb-6">
          {floorView === null ? (
            /* Department blocks: click opens in-place page */
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                Departments
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 max-w-4xl">
                {floorDepartmentBlocks.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFloorView(id)}
                    className="h-28 sm:h-32 flex flex-col items-center justify-center gap-2 text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    <Icon className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                    <span className="text-center leading-tight font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* In-place page for selected department (title bar and bottom bar unchanged) */
            <div className={(floorView === "printing" || floorView === "inspection" || floorView === "ecl" || floorView === "lamination" || floorView === "slitting") ? "space-y-4 w-full" : "space-y-4 max-w-4xl"}>
              {(floorView === "printing" && printingSelectedWo) ||
              (floorView === "inspection" && inspectionSelectedWo) ||
              (floorView === "ecl" && eclSelectedWo) ||
              (floorView === "lamination" && laminationSelectedWo) ||
              (floorView === "slitting" && slittingSelectedWo) ? (
                <div className="flex items-center relative w-full">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-2 -ml-2 shrink-0"
                    onClick={() => setFloorView(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Departments
                  </Button>
                  <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize pointer-events-none">
                    {floorView === "printing"
                      ? "Printing"
                      : floorView === "inspection"
                        ? "Inspection"
                        : floorView === "ecl"
                          ? "ECL"
                          : floorView === "lamination"
                            ? "Lamination"
                            : "Slitting"}
                  </h2>
                  <div className="shrink-0 w-[180px]" aria-hidden />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 -ml-2"
                  onClick={() => setFloorView(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Departments
                </Button>
              )}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                {(floorView === "printing" && printingSelectedWo) ||
                (floorView === "inspection" && inspectionSelectedWo) ||
                (floorView === "ecl" && eclSelectedWo) ||
                (floorView === "lamination" && laminationSelectedWo) ||
                (floorView === "slitting" && slittingSelectedWo) ? (
                  <div className="flex items-center justify-between gap-4">
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
                      Back to work orders
                    </Button>
                    <div className="space-y-0.5 text-center flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        Work order number — {(floorView === "printing"
                          ? printingSelectedWo
                          : floorView === "inspection"
                            ? inspectionSelectedWo
                            : floorView === "ecl"
                              ? eclSelectedWo
                              : floorView === "lamination"
                                ? laminationSelectedWo
                                : slittingSelectedWo)?.woNumber ?? `WO ${(floorView === "printing" ? printingSelectedWo : floorView === "inspection" ? inspectionSelectedWo : floorView === "ecl" ? eclSelectedWo : floorView === "lamination" ? laminationSelectedWo : slittingSelectedWo)?.id}`}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Customer — {(floorView === "printing" ? printingSelectedWo : floorView === "inspection" ? inspectionSelectedWo : floorView === "ecl" ? eclSelectedWo : floorView === "lamination" ? laminationSelectedWo : slittingSelectedWo)?.partyName ?? "—"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Variety — {(floorView === "printing" ? printingSelectedWo : floorView === "inspection" ? inspectionSelectedWo : floorView === "ecl" ? eclSelectedWo : floorView === "lamination" ? laminationSelectedWo : slittingSelectedWo)?.itemName ?? "—"}
                      </p>
                    </div>
                    <div className="w-[180px] shrink-0" aria-hidden />
                  </div>
                ) : (
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize text-center">
                    {floorDepartmentBlocks.find((b) => b.id === floorView)?.label ?? floorView}
                  </h2>
                )}
                {floorView === "printing" ? (
                  printingSelectedWo ? (
                    /* Page: current loaded roll for selected work order */
                    <div className="space-y-4 mt-4">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                        <div>
                          {/* Table of rolls (children of consumed/loaded rolls) — fetched from DB so it survives refresh */}
                          
                          {/* Consumed roll (full width; WO info now at top of card) */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Loaded roll
                            </h4>
                            {printingRollsLoading ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                            ) : printingLoadedRolls.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No roll currently loaded for this work order.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {printingLoadedRolls.map(({ jobCardNumber, jobCardId, roll }) => (
                                  <div
                                    key={`${jobCardNumber}-${roll.id}`}
                                    className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm"
                                  >
                                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                                      Job card: {jobCardNumber}
                                    </div>
                                    <dl className="grid grid-cols-5 gap-x-6 gap-y-2 text-gray-600 dark:text-gray-400">
                                      <div>
                                        <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Barcode</dt>
                                        <dd className="font-mono text-gray-900 dark:text-gray-100">{roll.barcode}</dd>
                                      </div>
                                      {(roll.item_name ?? roll.itemName) != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Item</dt>
                                          <dd>{roll.item_name ?? roll.itemName}</dd>
                                        </div>
                                      )}
                                      {roll.size != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Size</dt>
                                          <dd>{roll.size}</dd>
                                        </div>
                                      )}
                                      {roll.micron != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Micron</dt>
                                          <dd>{roll.micron}</dd>
                                        </div>
                                      )}
                                      {roll.netweight != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Net weight</dt>
                                          <dd>{Number(roll.netweight).toFixed(2)} kg</dd>
                                        </div>
                                      )}
                                    </dl>
                                    {!(printingAddRollForm?.roll.id === roll.id) && (
                                      <div className="mt-4 pt-3 flex items-center justify-end">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="gap-1"
                                          disabled={printingCreateChildLoading}
                                          onClick={async () => {
                                            const woItemId = printingSelectedWo?.itemId
                                            if (woItemId == null) {
                                              setPrintingCreateChildMessage("Work order has no item.")
                                              return
                                            }
                                            try {
                                              setPrintingCreateChildLoading(true)
                                              setPrintingCreateChildMessage(null)
                                              const parent = await getRollsStockById(roll.id)
                                              setPrintingAddRollEditingField(null)
                                              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                                              setPrintingAddRollForm({
                                                jobCardNumber,
                                                jobCardId,
                                                roll,
                                                parent: {
                                                  gradeId: parent.gradeId,
                                                },
                                                size: roll.size != null ? String(roll.size) : "",
                                                micron: roll.micron != null ? String(roll.micron) : "",
                                                netweight: roll.netweight != null ? String(roll.netweight) : "",
                                                grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (roll.netweight != null ? String(roll.netweight) : "")),
                                              })
                                            } catch {
                                              setPrintingCreateChildMessage("Failed to load parent roll.")
                                            } finally {
                                              setPrintingCreateChildLoading(false)
                                            }
                                          }}
                                        >
                                          Add to stock
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {(printingChildRollsLoading || printingChildRollsFromDb.length > 0) && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Produced rolls
                              </h4>
                              {printingChildRollsLoading ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
                              ) : (
                                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Barcode
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Size
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Micron
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Net weight
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Gross weight
                                        </th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Reprint
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {printingChildRollsFromDb.map((r) => (
                                        <tr
                                          key={r.id}
                                          className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                        >
                                          <td className="py-2 px-3 font-mono text-gray-900 dark:text-gray-100">
                                            {r.barcode || "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.size != null ? String(r.size) : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.micron != null ? String(r.micron) : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.netweight != null ? `${Number(r.netweight).toFixed(2)} kg` : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.grossweight != null ? `${Number(r.grossweight).toFixed(2)} kg` : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={!wipPrintingTemplate || printingCreateChildLoading}
                                              onClick={async () => {
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
                                              }}
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {/* New roll to stock (WIP printed) — below Rolls added this session */}
                          {printingAddRollForm && printingFormCommittedForRollId !== printingAddRollForm.roll.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">

                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="col-span-2 sm:col-span-4">
                                  <Label className="text-xs">Item (from work order)</Label>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                                    {printingSelectedWo?.itemName ?? "—"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs">Size</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {printingAddRollEditingField === "size" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={printingAddRollForm.size}
                                          onChange={(e) =>
                                            setPrintingAddRollForm((prev) =>
                                              prev ? { ...prev, size: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {printingAddRollForm.size || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField("size")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Micron</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {printingAddRollEditingField === "micron" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={printingAddRollForm.micron}
                                          onChange={(e) =>
                                            setPrintingAddRollForm((prev) =>
                                              prev ? { ...prev, micron: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {printingAddRollForm.micron || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField("micron")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Net weight (kg)</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {printingAddRollEditingField === "netweight" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={printingAddRollForm.netweight}
                                          onChange={(e) =>
                                            setPrintingAddRollForm((prev) =>
                                              prev ? { ...prev, netweight: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {printingAddRollForm.netweight || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField("netweight")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Gross weight (kg)</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {printingAddRollEditingField === "grossweight" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={printingAddRollForm.grossweight}
                                          onChange={(e) =>
                                            setPrintingAddRollForm((prev) =>
                                              prev ? { ...prev, grossweight: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {printingAddRollForm.grossweight || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setPrintingAddRollEditingField("grossweight")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
                          {!printingRollsLoading && printingLoadedRolls.length > 0 && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="gap-2"
                                disabled={
                                  printingCreateChildLoading ||
                                  (printingAddRollForm != null && printingFormCommittedForRollId === printingAddRollForm.roll.id)
                                }
                                onClick={async () => {
                                  const form = printingAddRollForm
                                  const wo = printingSelectedWo
                                  if (form && wo?.itemId != null) {
                                    try {
                                      setPrintingCreateChildLoading(true)
                                      setPrintingCreateChildMessage(null)
                                      const parentIds = printingLoadedRolls.map((r) => r.roll.id)
                                      if (wipPrintingTemplate) {
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
                                          jobCard: {
                                            id: form.jobCardId,
                                            jobCardNumber: form.jobCardNumber,
                                          },
                                          roll: {
                                            size: form.size ? parseFloat(form.size) : undefined,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                                            grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                            itemName: wo.itemName ?? null,
                                          },
                                        }
                                        const job = await createPrintJob({
                                          name: `WIP Printing - ${form.jobCardNumber}`,
                                          template_id: wipPrintingTemplate.id,
                                          data: printData,
                                          copies: 1,
                                        })
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
                                      }

                                      await addPrintedRoll(form.jobCardId, {
                                        itemId: wo.itemId,
                                        rollno: "",
                                        size: form.size ? parseFloat(form.size) : undefined,
                                        micron: form.micron ? parseFloat(form.micron) : undefined,
                                        netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                                        grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                        gradeId: form.parent.gradeId,
                                        parentRollIds: parentIds.length > 0 ? parentIds : undefined,
                                        weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                      })
                                      setPrintingFormCommittedForRollId(form.roll.id)
                                      getRollsStockByParentIds(parentIds, "wip_printed").then(
                                        setPrintingChildRollsFromDb
                                      )

                                      setPrintingCreateChildMessage(
                                        wipPrintingTemplate
                                          ? "Roll added and label sent to printer."
                                          : "Roll added and movement recorded. No WIP printing template configured."
                                      )
                                    } catch {
                                      setPrintingCreateChildMessage(
                                        wipPrintingTemplate
                                          ? "Failed to print label. Roll not added or movement not recorded."
                                          : "Failed to add roll or record movement."
                                      )
                                    } finally {
                                      setPrintingCreateChildLoading(false)
                                    }
                                  }
                                }}
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </Button>
                              {printingAddRollForm &&
                                printingFormCommittedForRollId === printingAddRollForm.roll.id && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                      setPrintingFormCommittedForRollId(null)
                                      setPrintingAddRollForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              size: prev.roll.size != null ? String(prev.roll.size) : "",
                                              micron: prev.roll.micron != null ? String(prev.roll.micron) : "",
                                              netweight: prev.roll.netweight != null ? String(prev.roll.netweight) : "",
                                              grossweight: "",
                                            }
                                          : null
                                      )
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add new roll
                                  </Button>
                                )}
                              {printingAddRollForm && printingChildRollsFromDb.length > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  disabled={printingCreateChildLoading}
                                  onClick={async () => {
                                    const form = printingAddRollForm
                                    if (!form) return
                                    if (!window.confirm("Are you sure you want to finish? This will mark the loaded roll as consumed.")) return
                                    try {
                                      setPrintingCreateChildLoading(true)
                                      setPrintingCreateChildMessage(null)
                                      await updateRollsStock(form.roll.id, { consumed: true })
                                      setPrintingCreateChildMessage("Loaded roll marked as consumed.")
                                      setPrintingCreateChildLoading(false)
                                      setTimeout(() => {
                                        setPrintingSelectedWo(null)
                                        setFloorView(null)
                                      }, 0)
                                    } catch {
                                      setPrintingCreateChildMessage("Failed to mark roll as consumed.")
                                      setPrintingCreateChildLoading(false)
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  Finish
                                </Button>
                              )}
                            </div>
                          )}
                          {printingCreateChildMessage && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {printingCreateChildMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* List of work orders with Printing job card that has loaded roll */
                    <>

                      {printingLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                      ) : printingError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{printingError}</p>
                      ) : printingWorkOrders.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {printingWorkOrders.map((wo) => (
                                <tr
                                  key={wo.id}
                                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                  onClick={() => setPrintingSelectedWo(wo)}
                                >
                                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td>
                                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td>
                                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                                  <td className="py-2">
                                    <span
                                      className={
                                        wo.status === "in_progress"
                                          ? "text-blue-600 dark:text-blue-400"
                                          : wo.status === "completed"
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-gray-600 dark:text-gray-400"
                                      }
                                    >
                                      {wo.status?.replace("_", " ") ?? "-"}
                                    </span>
                                  </td>
                                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                                    Click to view loaded roll
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                ) : floorView === "inspection" ? (
                  inspectionSelectedWo ? (
                    /* Inspection: current loaded roll for selected work order (UI matches Printing) */
                    <div className="space-y-4 mt-4">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                        <div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                              Loaded roll
                            </h4>
                            {inspectionRollsLoading ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                            ) : inspectionLoadedRolls.length === 0 ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                No roll currently loaded for this work order.
                              </p>
                            ) : (
                              <div className="space-y-4">
                                {inspectionLoadedRolls.map(({ jobCardNumber, jobCardId, roll }) => (
                                  <div
                                    key={`${jobCardNumber}-${roll.id}`}
                                    className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm"
                                  >
                                    <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                                      Job card: {jobCardNumber}
                                    </div>
                                    <dl className="grid grid-cols-5 gap-x-6 gap-y-2 text-gray-600 dark:text-gray-400">
                                      <div>
                                        <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Barcode</dt>
                                        <dd className="font-mono text-gray-900 dark:text-gray-100">{roll.barcode}</dd>
                                      </div>
                                      {(roll.item_name ?? roll.itemName) != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Item</dt>
                                          <dd>{roll.item_name ?? roll.itemName}</dd>
                                        </div>
                                      )}
                                      {roll.size != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Size</dt>
                                          <dd>{roll.size}</dd>
                                        </div>
                                      )}
                                      {roll.micron != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Micron</dt>
                                          <dd>{roll.micron}</dd>
                                        </div>
                                      )}
                                      {roll.netweight != null && (
                                        <div>
                                          <dt className="text-xs uppercase text-gray-500 dark:text-gray-500">Net weight</dt>
                                          <dd>{Number(roll.netweight).toFixed(2)} kg</dd>
                                        </div>
                                      )}
                                    </dl>
                                    {!(inspectionAddRollForm?.roll.id === roll.id) && (
                                      <div className="mt-4 pt-3 flex items-center justify-end">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          className="gap-1"
                                          disabled={inspectionCreateChildLoading}
                                          onClick={async () => {
                                            try {
                                              setInspectionCreateChildLoading(true)
                                              setInspectionCreateChildMessage(null)
                                              const parent = await getRollsStockById(roll.id)
                                              setInspectionAddRollEditingField(null)
                                              const grossFromScale = scaleWeight != null ? String(scaleWeight) : ""
                                              setInspectionAddRollForm({
                                                jobCardNumber,
                                                jobCardId,
                                                roll,
                                                parent: { gradeId: parent.gradeId },
                                                size: roll.size != null ? String(roll.size) : "",
                                                micron: roll.micron != null ? String(roll.micron) : "",
                                                netweight: roll.netweight != null ? String(roll.netweight) : "",
                                                grossweight: grossFromScale || (parent.grossweight != null ? String(parent.grossweight) : (roll.netweight != null ? String(roll.netweight) : "")),
                                              })
                                            } catch {
                                              setInspectionCreateChildMessage("Failed to load parent roll.")
                                            } finally {
                                              setInspectionCreateChildLoading(false)
                                            }
                                          }}
                                        >
                                          Add to stock
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {(inspectionChildRollsLoading || inspectionChildRollsFromDb.length > 0) && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Produced rolls
                              </h4>
                              {inspectionChildRollsLoading ? (
                                <p className="text-sm text-gray-500 dark:text-gray-400">Loading rolls…</p>
                              ) : (
                                <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Barcode
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Size
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Micron
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Net weight
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Gross weight
                                        </th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">
                                          Reprint
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {inspectionChildRollsFromDb.map((r) => (
                                        <tr
                                          key={r.id}
                                          className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                                        >
                                          <td className="py-2 px-3 font-mono text-gray-900 dark:text-gray-100">
                                            {r.barcode || "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.size != null ? String(r.size) : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.micron != null ? String(r.micron) : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.netweight != null ? `${Number(r.netweight).toFixed(2)} kg` : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                            {r.grossweight != null ? `${Number(r.grossweight).toFixed(2)} kg` : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              disabled={!wipPrintingTemplate || inspectionCreateChildLoading}
                                              onClick={async () => {
                                                const wo = inspectionSelectedWo
                                                if (!wo || !wipPrintingTemplate) return
                                                try {
                                                  setInspectionCreateChildLoading(true)
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
                                                    name: `Inspection Reprint - ${wo.woNumber} - ${r.barcode || r.id}`,
                                                    template_id: wipPrintingTemplate.id,
                                                    data: printData,
                                                    copies: 1,
                                                  })
                                                  setInspectionCreateChildMessage("Label reprint sent to printer.")
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
                                                  setInspectionCreateChildMessage("Failed to send reprint to printer.")
                                                } finally {
                                                  setInspectionCreateChildLoading(false)
                                                }
                                              }}
                                            >
                                              <Printer className="h-4 w-4" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}

                          {inspectionAddRollForm && inspectionFormCommittedForRollId !== inspectionAddRollForm.roll.id && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="col-span-2 sm:col-span-4">
                                  <Label className="text-xs">Item (from work order)</Label>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                                    {inspectionSelectedWo?.itemName ?? "—"}
                                  </p>
                                </div>
                                <div className="col-span-2 sm:col-span-4">
                                  <Label className="text-xs">Barcode</Label>
                                  <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                                    {inspectionAddRollForm.roll.barcode ?? "—"}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-xs">Size</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {inspectionAddRollEditingField === "size" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={inspectionAddRollForm.size}
                                          onChange={(e) =>
                                            setInspectionAddRollForm((prev) =>
                                              prev ? { ...prev, size: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {inspectionAddRollForm.size || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField("size")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Micron</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {inspectionAddRollEditingField === "micron" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={inspectionAddRollForm.micron}
                                          onChange={(e) =>
                                            setInspectionAddRollForm((prev) =>
                                              prev ? { ...prev, micron: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {inspectionAddRollForm.micron || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField("micron")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Net weight (kg)</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {inspectionAddRollEditingField === "netweight" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={inspectionAddRollForm.netweight}
                                          onChange={(e) =>
                                            setInspectionAddRollForm((prev) =>
                                              prev ? { ...prev, netweight: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {inspectionAddRollForm.netweight || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField("netweight")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Gross weight (kg)</Label>
                                  <div className="mt-1 flex items-center gap-1 rounded-md border border-input bg-background h-8 px-3 py-0">
                                    {inspectionAddRollEditingField === "grossweight" ? (
                                      <>
                                        <Input
                                          type="number"
                                          step="any"
                                          className="h-7 flex-1 min-w-0 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                                          value={inspectionAddRollForm.grossweight}
                                          onChange={(e) =>
                                            setInspectionAddRollForm((prev) =>
                                              prev ? { ...prev, grossweight: e.target.value } : null
                                            )
                                          }
                                          autoFocus
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField(null)}
                                        >
                                          <Check className="h-3.5 w-3.5" />
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                                          {inspectionAddRollForm.grossweight || "—"}
                                        </span>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => setInspectionAddRollEditingField("grossweight")}
                                        >
                                          <Pencil className="h-3.5 w-3.5 text-gray-500" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap">
                          {!inspectionRollsLoading && inspectionLoadedRolls.length > 0 && (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="gap-2"
                                disabled={
                                  inspectionCreateChildLoading ||
                                  (inspectionAddRollForm != null && inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id)
                                }
                                onClick={async () => {
                                  const form = inspectionAddRollForm
                                  const wo = inspectionSelectedWo
                                  if (form && wo?.itemId != null) {
                                    try {
                                      setInspectionCreateChildLoading(true)
                                      setInspectionCreateChildMessage(null)
                                      const parentIds = inspectionLoadedRolls.map((r) => r.roll.id)

                                      if (wipPrintingTemplate) {
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
                                          jobCard: {
                                            id: form.jobCardId,
                                            jobCardNumber: form.jobCardNumber,
                                          },
                                          roll: {
                                            size: form.size ? parseFloat(form.size) : undefined,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                                            grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                            itemName: wo.itemName ?? null,
                                          },
                                        }
                                        const job = await createPrintJob({
                                          name: `Inspection - ${form.jobCardNumber}`,
                                          template_id: wipPrintingTemplate.id,
                                          data: printData,
                                          copies: 1,
                                        })
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
                                      }

                                      await addInspectionRoll(form.jobCardId, {
                                        itemId: wo.itemId,
                                        rollno: "",
                                        size: form.size ? parseFloat(form.size) : undefined,
                                        micron: form.micron ? parseFloat(form.micron) : undefined,
                                        netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                                        grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                        gradeId: form.parent.gradeId,
                                        parentRollIds: parentIds.length > 0 ? parentIds : undefined,
                                        weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                      })
                                      setInspectionFormCommittedForRollId(form.roll.id)
                                      getRollsStockByParentIds(parentIds, "wip_inspection").then(setInspectionChildRollsFromDb)
                                      setInspectionCreateChildMessage(
                                        wipPrintingTemplate
                                          ? "Roll added and label sent to printer."
                                          : "Roll added and movement recorded. No WIP printing template configured."
                                      )
                                    } catch {
                                      setInspectionCreateChildMessage(
                                        wipPrintingTemplate
                                          ? "Failed to print label. Roll not added or movement not recorded."
                                          : "Failed to add roll or record movement."
                                      )
                                    } finally {
                                      setInspectionCreateChildLoading(false)
                                    }
                                  }
                                }}
                              >
                                <Printer className="h-4 w-4" />
                                Print
                              </Button>
                              {inspectionAddRollForm &&
                                inspectionFormCommittedForRollId === inspectionAddRollForm.roll.id && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => {
                                      setInspectionFormCommittedForRollId(null)
                                      setInspectionAddRollForm((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              size: prev.roll.size != null ? String(prev.roll.size) : "",
                                              micron: prev.roll.micron != null ? String(prev.roll.micron) : "",
                                              netweight: prev.roll.netweight != null ? String(prev.roll.netweight) : "",
                                              grossweight: "",
                                            }
                                          : null
                                      )
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Add new roll
                                  </Button>
                                )}
                            </div>
                          )}
                          {inspectionCreateChildMessage && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {inspectionCreateChildMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 space-y-1">
                        <Label htmlFor="floor-inspection-barcode" className="text-xs text-gray-600 dark:text-gray-400">
                          Barcode
                        </Label>
                        <div className="relative max-w-md">
                          <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="floor-inspection-barcode"
                            type="text"
                            placeholder="Scan or enter roll barcode"
                            value={floorInspectionBarcode}
                            onChange={(e) => {
                              setFloorInspectionBarcode(e.target.value)
                              setFloorInspectionBarcodeError(null)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault()
                                void handleFloorInspectionBarcodeSubmit()
                              }
                            }}
                            disabled={floorInspectionBarcodeChecking}
                            className="pl-9"
                            autoComplete="off"
                          />
                        </div>
                        {floorInspectionBarcodeError && (
                          <p className="text-sm text-red-500">{floorInspectionBarcodeError}</p>
                        )}
                      </div>
                      {inspectionLoading ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                      ) : inspectionError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">{inspectionError}</p>
                      ) : inspectionWorkOrders.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
                                <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {inspectionWorkOrders.map((wo) => (
                                <tr
                                  key={wo.id}
                                  className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                  onClick={() => setInspectionSelectedWo(wo)}
                                >
                                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td>
                                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td>
                                  <td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                                  <td className="py-2">
                                    <span
                                      className={
                                        wo.status === "in_progress"
                                          ? "text-blue-600 dark:text-blue-400"
                                          : wo.status === "completed"
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-gray-600 dark:text-gray-400"
                                      }
                                    >
                                      {wo.status?.replace("_", " ") ?? "-"}
                                    </span>
                                  </td>
                                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                                    Click to view loaded roll
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                ) : floorView === "ecl" ? (
                  eclSelectedWo ? (
                    <div className="space-y-4 mt-4">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll(s)</h4>
                        {eclRollsLoading ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                        ) : eclLoadedRolls.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p>
                        ) : (
                          <div className="space-y-4">
                            {eclLoadedRolls.map(({ jobCardNumber, roll }) => (
                              <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Job card: {jobCardNumber}</div>
                                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                                  <div><dt className="text-xs uppercase text-gray-500">Barcode</dt><dd className="font-mono">{roll.barcode}</dd></div>
                                  {(roll.item_name ?? roll.itemName) != null && <div><dt className="text-xs uppercase text-gray-500">Item</dt><dd>{roll.item_name ?? roll.itemName}</dd></div>}
                                  {roll.size != null && <div><dt className="text-xs uppercase text-gray-500">Size</dt><dd>{roll.size}</dd></div>}
                                  {roll.micron != null && <div><dt className="text-xs uppercase text-gray-500">Micron</dt><dd>{roll.micron}</dd></div>}
                                  {roll.netweight != null && <div><dt className="text-xs uppercase text-gray-500">Net weight</dt><dd>{Number(roll.netweight).toFixed(2)} kg</dd></div>}
                                </dl>
                                {eclAddRollForm?.roll.id === roll.id && (
                                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><Label className="text-xs">Size</Label><Input type="text" value={eclAddRollForm.size} onChange={(e) => setEclAddRollForm((p) => p ? { ...p, size: e.target.value } : null)} placeholder="Size" /></div>
                                      <div><Label className="text-xs">Micron</Label><Input type="text" value={eclAddRollForm.micron} onChange={(e) => setEclAddRollForm((p) => p ? { ...p, micron: e.target.value } : null)} placeholder="Micron" /></div>
                                      <div><Label className="text-xs">Net weight</Label><Input type="text" value={eclAddRollForm.netweight} onChange={(e) => setEclAddRollForm((p) => p ? { ...p, netweight: e.target.value } : null)} placeholder="Net weight" /></div>
                                      <div><Label className="text-xs">Gross weight</Label><Input type="text" value={eclAddRollForm.grossweight} onChange={(e) => setEclAddRollForm((p) => p ? { ...p, grossweight: e.target.value } : null)} placeholder="Gross weight" /></div>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={eclCreateChildLoading || (eclAddRollForm != null && eclFormCommittedForRollId === eclAddRollForm.roll.id)}
                                      onClick={async () => {
                                        const form = eclAddRollForm
                                        const wo = eclSelectedWo
                                        if (!form || wo?.itemId == null) return
                                        try {
                                          setEclCreateChildLoading(true)
                                          setEclCreateChildMessage(null)
                                          const parentIds = eclLoadedRolls.map((r) => r.roll.id)
                                          await addEclRoll(form.jobCardId, {
                                            itemId: wo.itemId,
                                            rollno: "",
                                            size: form.size ? parseFloat(form.size) : undefined,
                                            micron: form.micron ? parseFloat(form.micron) : undefined,
                                            netweight: form.netweight ? parseFloat(form.netweight) : undefined,
                                            grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                            gradeId: form.parent.gradeId,
                                            parentRollIds: parentIds.length > 0 ? parentIds : undefined,
                                            weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined,
                                          })
                                          setEclFormCommittedForRollId(form.roll.id)
                                          setEclCreateChildMessage("Roll added.")
                                        } catch {
                                          setEclCreateChildMessage("Failed to add roll.")
                                        } finally {
                                          setEclCreateChildLoading(false)
                                        }
                                      }}
                                    >
                                      {eclCreateChildLoading ? "Adding…" : "Add roll"}
                                    </Button>
                                    {eclAddRollForm && eclFormCommittedForRollId === eclAddRollForm.roll.id && (
                                      <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setEclFormCommittedForRollId(null); setEclAddRollForm((p) => p ? { ...p, size: p.roll.size != null ? String(p.roll.size) : "", micron: p.roll.micron != null ? String(p.roll.micron) : "", netweight: p.roll.netweight != null ? String(p.roll.netweight) : "", grossweight: "" } : null) }}>
                                        <Plus className="h-4 w-4" /> Add new roll
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {eclCreateChildMessage && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{eclCreateChildMessage}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {eclLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : eclError ? <p className="text-sm text-red-600 dark:text-red-400">{eclError}</p> : eclWorkOrders.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-200 dark:border-gray-600"><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th></tr></thead>
                            <tbody>
                              {eclWorkOrders.map((wo) => (
                                <tr key={wo.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setEclSelectedWo(wo)}>
                                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                                  <td className="py-2"><span className={wo.status === "in_progress" ? "text-blue-600 dark:text-blue-400" : wo.status === "completed" ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>{wo.status?.replace("_", " ") ?? "-"}</span></td>
                                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">Click to view loaded roll</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                ) : floorView === "lamination" ? (
                  laminationSelectedWo ? (
                    <div className="space-y-4 mt-4">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll(s)</h4>
                        {laminationRollsLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : laminationLoadedRolls.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p> : (
                          <div className="space-y-4">
                            {laminationLoadedRolls.map(({ jobCardNumber, roll }) => (
                              <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Job card: {jobCardNumber}</div>
                                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                                  <div><dt className="text-xs uppercase text-gray-500">Barcode</dt><dd className="font-mono">{roll.barcode}</dd></div>
                                  {(roll.item_name ?? roll.itemName) != null && <div><dt className="text-xs uppercase text-gray-500">Item</dt><dd>{roll.item_name ?? roll.itemName}</dd></div>}
                                  {roll.size != null && <div><dt className="text-xs uppercase text-gray-500">Size</dt><dd>{roll.size}</dd></div>}
                                  {roll.micron != null && <div><dt className="text-xs uppercase text-gray-500">Micron</dt><dd>{roll.micron}</dd></div>}
                                  {roll.netweight != null && <div><dt className="text-xs uppercase text-gray-500">Net weight</dt><dd>{Number(roll.netweight).toFixed(2)} kg</dd></div>}
                                </dl>
                                {laminationAddRollForm?.roll.id === roll.id && (
                                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><Label className="text-xs">Size</Label><Input type="text" value={laminationAddRollForm.size} onChange={(e) => setLaminationAddRollForm((p) => p ? { ...p, size: e.target.value } : null)} placeholder="Size" /></div>
                                      <div><Label className="text-xs">Micron</Label><Input type="text" value={laminationAddRollForm.micron} onChange={(e) => setLaminationAddRollForm((p) => p ? { ...p, micron: e.target.value } : null)} placeholder="Micron" /></div>
                                      <div><Label className="text-xs">Net weight</Label><Input type="text" value={laminationAddRollForm.netweight} onChange={(e) => setLaminationAddRollForm((p) => p ? { ...p, netweight: e.target.value } : null)} placeholder="Net weight" /></div>
                                      <div><Label className="text-xs">Gross weight</Label><Input type="text" value={laminationAddRollForm.grossweight} onChange={(e) => setLaminationAddRollForm((p) => p ? { ...p, grossweight: e.target.value } : null)} placeholder="Gross weight" /></div>
                                    </div>
                                    <Button type="button" size="sm" disabled={laminationCreateChildLoading || (laminationAddRollForm != null && laminationFormCommittedForRollId === laminationAddRollForm.roll.id)} onClick={async () => {
                                      const form = laminationAddRollForm
                                      const wo = laminationSelectedWo
                                      if (!form || wo?.itemId == null) return
                                      try {
                                        setLaminationCreateChildLoading(true)
                                        setLaminationCreateChildMessage(null)
                                        const parentIds = laminationLoadedRolls.map((r) => r.roll.id)
                                        await addLaminationRoll(form.jobCardId, { itemId: wo.itemId, rollno: "", size: form.size ? parseFloat(form.size) : undefined, micron: form.micron ? parseFloat(form.micron) : undefined, netweight: form.netweight ? parseFloat(form.netweight) : undefined, grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined, gradeId: form.parent.gradeId, parentRollIds: parentIds.length > 0 ? parentIds : undefined, weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined })
                                        setLaminationFormCommittedForRollId(form.roll.id)
                                        setLaminationCreateChildMessage("Roll added.")
                                      } catch { setLaminationCreateChildMessage("Failed to add roll.") }
                                      finally { setLaminationCreateChildLoading(false) }
                                    }}>{laminationCreateChildLoading ? "Adding…" : "Add roll"}</Button>
                                    {laminationAddRollForm && laminationFormCommittedForRollId === laminationAddRollForm.roll.id && (
                                      <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setLaminationFormCommittedForRollId(null); setLaminationAddRollForm((p) => p ? { ...p, size: p.roll.size != null ? String(p.roll.size) : "", micron: p.roll.micron != null ? String(p.roll.micron) : "", netweight: p.roll.netweight != null ? String(p.roll.netweight) : "", grossweight: "" } : null) }}><Plus className="h-4 w-4" /> Add new roll</Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {laminationCreateChildMessage && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{laminationCreateChildMessage}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {laminationLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : laminationError ? <p className="text-sm text-red-600 dark:text-red-400">{laminationError}</p> : laminationWorkOrders.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-200 dark:border-gray-600"><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th></tr></thead>
                            <tbody>
                              {laminationWorkOrders.map((wo) => (
                                <tr key={wo.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setLaminationSelectedWo(wo)}>
                                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                                  <td className="py-2"><span className={wo.status === "in_progress" ? "text-blue-600 dark:text-blue-400" : wo.status === "completed" ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>{wo.status?.replace("_", " ") ?? "-"}</span></td>
                                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">Click to view loaded roll</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                ) : floorView === "slitting" ? (
                  slittingSelectedWo ? (
                    <div className="space-y-4 mt-4">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-6">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Loaded roll</h4>
                        {slittingRollsLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : slittingLoadedRolls.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No roll currently loaded for this work order.</p> : (
                          <div className="space-y-4">
                            {slittingLoadedRolls.map(({ jobCardNumber, roll }) => (
                              <div key={`${jobCardNumber}-${roll.id}`} className="rounded-md border border-gray-200 dark:border-gray-700 p-4 text-sm">
                                <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Job card: {jobCardNumber}</div>
                                <dl className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-1 text-gray-600 dark:text-gray-400">
                                  <div><dt className="text-xs uppercase text-gray-500">Barcode</dt><dd className="font-mono">{roll.barcode}</dd></div>
                                  {(roll.item_name ?? roll.itemName) != null && <div><dt className="text-xs uppercase text-gray-500">Item</dt><dd>{roll.item_name ?? roll.itemName}</dd></div>}
                                  {roll.size != null && <div><dt className="text-xs uppercase text-gray-500">Size</dt><dd>{roll.size}</dd></div>}
                                  {roll.micron != null && <div><dt className="text-xs uppercase text-gray-500">Micron</dt><dd>{roll.micron}</dd></div>}
                                  {roll.netweight != null && <div><dt className="text-xs uppercase text-gray-500">Net weight</dt><dd>{Number(roll.netweight).toFixed(2)} kg</dd></div>}
                                </dl>
                                {slittingAddRollForm?.roll.id === roll.id && (
                                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                      <div><Label className="text-xs">Size</Label><Input type="text" value={slittingAddRollForm.size} onChange={(e) => setSlittingAddRollForm((p) => p ? { ...p, size: e.target.value } : null)} placeholder="Size" /></div>
                                      <div><Label className="text-xs">Micron</Label><Input type="text" value={slittingAddRollForm.micron} onChange={(e) => setSlittingAddRollForm((p) => p ? { ...p, micron: e.target.value } : null)} placeholder="Micron" /></div>
                                      <div><Label className="text-xs">Net weight</Label><Input type="text" value={slittingAddRollForm.netweight} onChange={(e) => setSlittingAddRollForm((p) => p ? { ...p, netweight: e.target.value } : null)} placeholder="Net weight" /></div>
                                      <div><Label className="text-xs">Gross weight</Label><Input type="text" value={slittingAddRollForm.grossweight} onChange={(e) => setSlittingAddRollForm((p) => p ? { ...p, grossweight: e.target.value } : null)} placeholder="Gross weight" /></div>
                                    </div>
                                    <Button type="button" size="sm" disabled={slittingCreateChildLoading || (slittingAddRollForm != null && slittingFormCommittedForRollId === slittingAddRollForm.roll.id)} onClick={async () => {
                                      const form = slittingAddRollForm
                                      const wo = slittingSelectedWo
                                      if (!form || wo?.itemId == null) return
                                      try {
                                        setSlittingCreateChildLoading(true)
                                        setSlittingCreateChildMessage(null)
                                        const parentIds = slittingLoadedRolls.map((r) => r.roll.id)
                                        await addSlittingRoll(form.jobCardId, { itemId: wo.itemId, rollno: "", size: form.size ? parseFloat(form.size) : undefined, micron: form.micron ? parseFloat(form.micron) : undefined, netweight: form.netweight ? parseFloat(form.netweight) : undefined, grossweight: form.grossweight ? parseFloat(form.grossweight) : undefined, gradeId: form.parent.gradeId, parentRollIds: parentIds.length > 0 ? parentIds : undefined, weightAtTime: form.grossweight ? parseFloat(form.grossweight) : undefined })
                                        setSlittingFormCommittedForRollId(form.roll.id)
                                        setSlittingCreateChildMessage("Roll added.")
                                      } catch { setSlittingCreateChildMessage("Failed to add roll.") }
                                      finally { setSlittingCreateChildLoading(false) }
                                    }}>{slittingCreateChildLoading ? "Adding…" : "Add roll"}</Button>
                                    {slittingAddRollForm && slittingFormCommittedForRollId === slittingAddRollForm.roll.id && (
                                      <Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => { setSlittingFormCommittedForRollId(null); setSlittingAddRollForm((p) => p ? { ...p, size: p.roll.size != null ? String(p.roll.size) : "", micron: p.roll.micron != null ? String(p.roll.micron) : "", netweight: p.roll.netweight != null ? String(p.roll.netweight) : "", grossweight: "" } : null) }}><Plus className="h-4 w-4" /> Add new roll</Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {slittingCreateChildMessage && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">{slittingCreateChildMessage}</p>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {slittingLoading ? <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p> : slittingError ? <p className="text-sm text-red-600 dark:text-red-400">{slittingError}</p> : slittingWorkOrders.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No work orders found.</p> : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-200 dark:border-gray-600"><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">WO Number</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Party</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Item</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th><th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Action</th></tr></thead>
                            <tbody>
                              {slittingWorkOrders.map((wo) => (
                                <tr key={wo.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer" onClick={() => setSlittingSelectedWo(wo)}>
                                  <td className="py-2 text-gray-900 dark:text-gray-100">{wo.woNumber ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.partyName ?? "-"}</td><td className="py-2 text-gray-700 dark:text-gray-300">{wo.itemName ?? "-"}</td>
                                  <td className="py-2"><span className={wo.status === "in_progress" ? "text-blue-600 dark:text-blue-400" : wo.status === "completed" ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}>{wo.status?.replace("_", " ") ?? "-"}</span></td>
                                  <td className="py-2 text-xs text-gray-500 dark:text-gray-400">Click to view loaded roll</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {floorView === "lamination" && "Lamination department view. Add content here."}
                    {floorView === "ecl" && "ECL department view. Add content here."}
                    {floorView === "slitting" && "Slitting department view. Add content here."}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Printer status bar - same as stock entry page */}
        <div
          className="fixed bottom-0 h-7 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 z-50 transition-all duration-200"
          style={{
            left: isMobile ? 0 : sidebarState === "expanded" ? "14rem" : "3rem",
            right: 0,
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Printer:</span>
            <span className="text-xs text-gray-900 dark:text-gray-100 font-semibold">{printerName || "Loading..."}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Status:</span>
            <span
              className={`text-xs font-semibold ${
                !printerAvailable
                  ? "text-red-600 dark:text-red-400"
                  : printingPrintStatus === "printing"
                    ? "text-blue-600 dark:text-blue-400"
                    : printingPrintStatus === "done"
                      ? "text-green-600 dark:text-green-400"
                      : websocketConnected
                        ? "text-gray-600 dark:text-gray-400"
                        : "text-yellow-600 dark:text-yellow-400"
              }`}
            >
              {!printerAvailable
                ? "Not available"
                : printingPrintStatus === "printing"
                  ? "Printing..."
                  : printingPrintStatus === "done"
                    ? "Done"
                    : websocketConnected
                      ? "Idle"
                      : "Poll"}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isStockUser) {
    return (
      <div className="px-6 pt-2 pb-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Home Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Welcome to Production ERP
          </p>
        </div>

        {/* 2 main blocks for stock user */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl mb-8">
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-base"
            onClick={() => navigate("/manufacturing/stock-entry")}
          >
            <Box className="h-6 w-6" />
            <span>Stock Entry</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-base"
            onClick={() => navigate("/manufacturing/reports/stock")}
          >
            <BarChart3 className="h-6 w-6" />
            <span>Stock Report</span>
          </Button>
        </div>

        {/* RM Report: all report blocks as in menu bar */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            RM Report
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rmReportBlocks.map(({ label, icon: Icon, path }) => (
              <Button
                key={path}
                type="button"
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-1.5 text-sm"
                onClick={() => navigate(path)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-tight">{label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Home Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Welcome to Production ERP
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 max-w-4xl">
        {homeActions
          .filter(({ path, label }) => {
            // Printing user: hide Stock Entry
            if (isPrintingUser && (path === "/manufacturing/stock-entry" || label === "Stock")) {
              return false
            }
            return true
          })
          .map(({ label, icon: Icon, path }) => (
          <Button
            key={label}
            type="button"
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-2 text-base"
            onClick={() => {
              if (path) {
                navigate(path)
              }
            }}
          >
            <Icon className="h-6 w-6" />
            <span>{label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}
