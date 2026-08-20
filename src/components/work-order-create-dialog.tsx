import { useEffect, useRef, useState } from "react"
import { ArrowRight, X } from "lucide-react"

import type { WorkOrderMaster } from "@/components/columns/work-order-columns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getItemBom, getItemsFgVarietyByParty, type BomLine } from "@/lib/item-api"
import { getAllMachines } from "@/lib/machine-api"
import { getAllOperators } from "@/lib/operator-api"
import { getPartyCustomers } from "@/lib/party-api"
import { createWorkOrder } from "@/lib/work-order-api"
import { FgStageBomReadonly } from "@/components/fg-stage-bom-readonly"

type WorkOrderForm = {
  partyId: string
  itemId: string
  plannedQty: string
  priority: string
  machineId: string
  operatorName: string
  shift: string
}

const emptyForm = (): WorkOrderForm => ({
  partyId: "",
  itemId: "",
  plannedQty: "",
  priority: "normal",
  machineId: "",
  operatorName: "",
  shift: "",
})

const fallbackPriorities = ["low", "normal", "high"]
const fallbackShifts = ["A", "B"]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (workOrder: WorkOrderMaster) => void
}

export function WorkOrderCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [formData, setFormData] = useState<WorkOrderForm>(emptyForm())
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof WorkOrderForm, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [itemOptions, setItemOptions] = useState<CreatableOption[]>([])
  const [machines, setMachines] = useState<CreatableOption[]>([])
  const [operators, setOperators] = useState<string[]>([])
  const [bomTemplateLines, setBomTemplateLines] = useState<BomLine[]>([])
  const [bomTemplateLoading, setBomTemplateLoading] = useState(false)
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) return
    setFormData(emptyForm())
    setFormErrors({})
    setItemOptions([])
    setBomTemplateLines([])
    requestAnimationFrame(() => {
      addFieldRefs.current[0]?.focus()
    })

    const loadLookups = async () => {
      try {
        const [parties, machineRows, operatorRows] = await Promise.all([
          getPartyCustomers(),
          getAllMachines(),
          getAllOperators(),
        ])
        setPartyOptions(parties.map((p) => ({ value: p.id.toString(), label: p.partyCode })))
        setMachines(machineRows.map((m) => ({ value: m.id.toString(), label: m.machineCode })))
        setOperators(Array.from(new Set(operatorRows.map((op) => op.operatorName))))
      } catch (error) {
        console.error("Failed to load work order lookups:", error)
      }
    }
    void loadLookups()
  }, [open])

  useEffect(() => {
    if (!open || !formData.partyId) {
      if (!formData.partyId) setItemOptions([])
      return
    }
    const loadItems = async () => {
      try {
        const data = await getItemsFgVarietyByParty(parseInt(formData.partyId, 10))
        setItemOptions(data.map((i) => ({ value: i.id.toString(), label: i.itemCode })))
      } catch (error) {
        console.error("Failed to load items for party:", error)
        setItemOptions([])
      }
    }
    void loadItems()
  }, [open, formData.partyId])

  useEffect(() => {
    if (!open) return
    const itemId = formData.itemId.trim()
    if (!itemId) {
      setBomTemplateLines([])
      setBomTemplateLoading(false)
      return
    }
    let cancelled = false
    setBomTemplateLoading(true)
    getItemBom(parseInt(itemId, 10))
      .then((lines) => {
        if (!cancelled) setBomTemplateLines(lines)
      })
      .catch(() => {
        if (!cancelled) setBomTemplateLines([])
      })
      .finally(() => {
        if (!cancelled) setBomTemplateLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, formData.itemId])

  const handleInputChange = (field: keyof WorkOrderForm, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "partyId") {
        next.itemId = ""
      }
      return next
    })
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEnterKey = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement>,
    index: number
  ) => {
    if (event.key !== "Enter") return
    const nextField = addFieldRefs.current[index + 1]
    if (nextField) {
      event.preventDefault()
      nextField.focus()
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof WorkOrderForm, string>> = {}
    if (!formData.partyId.trim()) errors.partyId = "Party is required"
    if (!formData.itemId.trim()) errors.itemId = "Item is required"
    if (formData.plannedQty.trim()) {
      const qty = parseFloat(formData.plannedQty)
      if (isNaN(qty) || qty <= 0) {
        errors.plannedQty = "Planned quantity must be a positive number"
      }
    }
    if (!formData.machineId.trim()) errors.machineId = "Machine is required"
    if (!formData.operatorName.trim()) errors.operatorName = "Operator name is required"
    if (!formData.shift.trim()) errors.shift = "Shift is required"
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    createWorkOrder({
      woNumber: null,
      partyId: parseInt(formData.partyId),
      itemId: parseInt(formData.itemId),
      plannedQty: formData.plannedQty.trim() ? parseFloat(formData.plannedQty) : undefined,
      priority: formData.priority,
      status: "planned",
      machineId: parseInt(formData.machineId),
      operatorName: formData.operatorName,
      shift: formData.shift,
    })
      .then((newWorkOrder) => {
        onCreated(newWorkOrder)
        onOpenChange(false)
      })
      .catch((err) => {
        console.error("Error creating work order:", err)
        const errorMsg = err.response?.data?.detail || "Failed to create work order. Please try again."
        setFormErrors({ partyId: errorMsg })
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Add New Work Order</CardTitle>
            <CardDescription>Create a new work order with production details.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partyId">Party (Customer/Both) *</Label>
                <CreatableCombobox
                  options={partyOptions}
                  value={formData.partyId || null}
                  onValueChange={(value) => handleInputChange("partyId", value ?? "")}
                  placeholder="Select party"
                  searchPlaceholder="Search party..."
                  triggerRef={(el) => {
                    addFieldRefs.current[0] = el
                  }}
                  onInputKeyDown={(e) => handleEnterKey(e, 0)}
                />
                {formErrors.partyId && <p className="text-sm text-red-500">{formErrors.partyId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="itemId">Item (FG Variety) *</Label>
                <CreatableCombobox
                  options={itemOptions}
                  value={formData.itemId || null}
                  onValueChange={(value) => handleInputChange("itemId", value ?? "")}
                  placeholder="Select item"
                  searchPlaceholder="Search item..."
                  triggerRef={(el) => {
                    addFieldRefs.current[1] = el
                  }}
                  onInputKeyDown={(e) => handleEnterKey(e, 1)}
                />
                {formErrors.itemId && <p className="text-sm text-red-500">{formErrors.itemId}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plannedQty">Planned Quantity (KG)</Label>
                <Input
                  id="plannedQty"
                  type="number"
                  step="0.01"
                  min="0"
                  ref={(el) => {
                    addFieldRefs.current[2] = el
                  }}
                  value={formData.plannedQty}
                  onChange={(e) => handleInputChange("plannedQty", e.target.value)}
                  onKeyDown={(e) => handleEnterKey(e, 2)}
                  placeholder="Enter planned quantity"
                  className={formErrors.plannedQty ? "border-red-500" : ""}
                />
                {formErrors.plannedQty && (
                  <p className="text-sm text-red-500">{formErrors.plannedQty}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleInputChange("priority", value)}
                >
                  <SelectTrigger
                    id="priority"
                    ref={(el) => {
                      addFieldRefs.current[3] = el
                    }}
                    onKeyDown={(e) => handleEnterKey(e, 3)}
                    className="w-full"
                    icon={ArrowRight}
                  >
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {fallbackPriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-semibold mb-4">Job Card Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="machineId">
                    Machine <span className="text-red-500">*</span>
                  </Label>
                  <CreatableCombobox
                    options={machines}
                    value={formData.machineId || null}
                    onValueChange={(value) => handleInputChange("machineId", value ?? "")}
                    placeholder="Select machine"
                    searchPlaceholder="Search machine..."
                    triggerRef={(el) => {
                      addFieldRefs.current[4] = el
                    }}
                    onInputKeyDown={(e) => handleEnterKey(e, 4)}
                  />
                  {formErrors.machineId && (
                    <p className="text-sm text-red-500">{formErrors.machineId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="operatorName">
                    Operator Name <span className="text-red-500">*</span>
                  </Label>
                  <CreatableCombobox
                    options={operators.map((op) => ({ value: op, label: op }))}
                    value={formData.operatorName || null}
                    onValueChange={(value) => handleInputChange("operatorName", value ?? "")}
                    placeholder="Enter or select operator"
                    searchPlaceholder="Search operator..."
                    triggerRef={(el) => {
                      addFieldRefs.current[5] = el
                    }}
                    onInputKeyDown={(e) => handleEnterKey(e, 5)}
                  />
                  {formErrors.operatorName && (
                    <p className="text-sm text-red-500">{formErrors.operatorName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shift">
                    Shift <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.shift}
                    onValueChange={(value) => handleInputChange("shift", value)}
                  >
                    <SelectTrigger
                      id="shift"
                      ref={(el) => {
                        addFieldRefs.current[6] = el
                      }}
                      onKeyDown={(e) => handleEnterKey(e, 6)}
                      className="w-full"
                      icon={ArrowRight}
                    >
                      <SelectValue placeholder="Select shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {fallbackShifts.map((shift) => (
                        <SelectItem key={shift} value={shift}>
                          {shift}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.shift && <p className="text-sm text-red-500">{formErrors.shift}</p>}
                </div>
              </div>
            </div>

            <div className="border-t pt-6 mt-6">
              <h3 className="text-sm font-semibold mb-1">BOM & structure</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Loaded from the selected FG variety in Item Master (read-only).
              </p>
              {!formData.itemId.trim() ? (
                <p className="text-sm text-muted-foreground">Select an FG variety to view BOM.</p>
              ) : bomTemplateLoading ? (
                <p className="text-sm text-muted-foreground">Loading BOM…</p>
              ) : (
                <FgStageBomReadonly lines={bomTemplateLines} />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Work Order"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
