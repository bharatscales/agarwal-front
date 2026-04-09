import {
  Box,
  ClipboardCheck,
  Cylinder,
  Droplets,
  Factory,
  FlaskConical,
  Layers,
  Printer,
  Scissors,
  StickyNote,
  Truck,
} from "lucide-react"

export const homeActions = [
  { label: "Stock", icon: Box, path: "/manufacturing/stock-entry" },
  { label: "Work Order", icon: Factory, path: "/manufacturing/work-order" },
  { label: "Printing", icon: Printer },
  { label: "Inspection", icon: ClipboardCheck },
  { label: "ECL Department", icon: Factory },
  { label: "Laminations", icon: Layers },
  { label: "Slitter", icon: Scissors },
  { label: "Dispatch", icon: Truck },
]

export type FloorDepartmentId = "printing" | "inspection" | "lamination" | "ecl" | "slitting"

export const floorDepartmentBlocks = [
  { id: "printing", label: "Printing", icon: Printer },
  { id: "inspection", label: "Inspection", icon: ClipboardCheck },
  { id: "ecl", label: "ECL", icon: Factory },
  { id: "lamination", label: "Lamination", icon: Layers },
  { id: "slitting", label: "Slitting", icon: Scissors },
] as const

export const rmReportBlocks = [
  { label: "Rm Film Stock", icon: Cylinder, path: "/manufacturing/reports/stock" },
  { label: "Rm Film Issued", icon: Cylinder, path: "/manufacturing/reports/roll-issues" },
  { label: "Rm Ink Stock", icon: Droplets, path: "/manufacturing/reports/ink-stock" },
  { label: "Rm Ink Issued", icon: Droplets, path: "/manufacturing/reports/ink-issues" },
  { label: "Rm Adhesive Stock", icon: StickyNote, path: "/manufacturing/reports/adhesive-stock" },
  { label: "Rm Adhesive Issued", icon: StickyNote, path: "/manufacturing/reports/adhesive-issues" },
  { label: "Rm Chemical Stock", icon: FlaskConical, path: "/manufacturing/reports/chemical-stock" },
  { label: "Rm Chemical Issued", icon: FlaskConical, path: "/manufacturing/reports/chemical-issues" },
]
