import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import api from "@/lib/axios"
import { createItem, type ItemPayload } from "@/lib/item-api"
import { getAllParties } from "@/lib/party-api"
import { useAuth } from "@/contexts/AuthContext"
import {
  FgStageBomEditor,
  stageEditorsToPayload,
  validateBomStages,
  type BomStageEditor,
} from "@/components/fg-stage-bom-editor"

type ItemForm = {
  itemCode: string
  itemName: string
  itemGroup: string
  partyId: string
  uom: string
  density: string
}

const fallbackItemGroups: CreatableOption[] = [
  { value: "rm film", label: "RM Film" },
  { value: "rm ink/adhesive/chemicals", label: "RM Ink/Adhesive/Chemicals" },
  { value: "fg variety", label: "FG Variety" },
  { value: "ink", label: "Ink" },
  { value: "adhesive", label: "Adhesive" },
  { value: "chemical", label: "Chemical" },
]

const parseDensity = (itemGroup: string, density: string): number | null => {
  if (itemGroup !== "rm film") return null
  const trimmed = density.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export default function ItemNew() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canCreate = user?.role === "admin" || user?.role === "superuser"

  const [formData, setFormData] = useState<ItemForm>({
    itemCode: "",
    itemName: "",
    itemGroup: "",
    partyId: "",
    uom: "",
    density: "",
  })
  const [bomStages, setBomStages] = useState<BomStageEditor[]>([])
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ItemForm, string>>>({})
  const [itemGroupOptions, setItemGroupOptions] = useState<CreatableOption[]>(fallbackItemGroups)
  const [partyOptions, setPartyOptions] = useState<CreatableOption[]>([])
  const [uomOptions, setUomOptions] = useState<CreatableOption[]>([{ value: "Nos", label: "Nos" }])
  const [uomMap, setUomMap] = useState<Map<string, number>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!canCreate) {
      navigate("/masters/item", { replace: true })
    }
  }, [canCreate, navigate])

  const fetchUomsWithIds = async () => {
    try {
      const response = await api.get<Array<{ id: number; uom: string }>>("/meta/uoms-with-ids")
      const uoms = response.data
      setUomMap(new Map(uoms.map((u) => [u.uom, u.id])))
      setUomOptions(uoms.map((u) => ({ value: u.uom, label: u.uom })))
    } catch {
      const uomsResponse = await api.get<string[]>("/meta/uoms")
      setUomOptions(uomsResponse.data.map((u) => ({ value: u, label: u })))
    }
  }

  const fetchParties = async () => {
    try {
      const data = await getAllParties()
      setPartyOptions(data.map((p) => ({ value: p.id.toString(), label: p.partyCode })))
    } catch (err) {
      console.error("Failed to load parties:", err)
    }
  }

  useEffect(() => {
    const fetchItemGroups = async () => {
      try {
        const response = await api.get<string[]>("/meta/item-groups")
        const labelMap: Record<string, string> = {
          "rm film": "RM Film",
          "rm ink/adhesive/chemicals": "RM Ink/Adhesive/Chemicals",
          "fg variety": "FG Variety",
        }
        const options = response.data.map((value) => ({
          value,
          label: labelMap[value] || value.replace(/^rm\b/i, "RM").replace(/^fg\b/i, "FG"),
        }))
        if (options.length > 0) setItemGroupOptions(options)
      } catch {
        setItemGroupOptions(fallbackItemGroups)
      }
    }

    fetchItemGroups()
    fetchUomsWithIds()
    fetchParties()
    requestAnimationFrame(() => firstFieldRef.current?.focus())
  }, [])

  const getUomId = (uomName: string): number | undefined => {
    if (!uomName.trim()) return undefined
    return uomMap.get(uomName.trim())
  }

  const handleInputChange = (field: keyof ItemForm, value: string) => {
    setFormData((prev) => {
      if (field === "itemCode") {
        const shouldSyncName = !prev.itemName.trim() || prev.itemName === prev.itemCode
        return {
          ...prev,
          itemCode: value,
          itemName: shouldSyncName ? value : prev.itemName,
        }
      }
      if (field === "itemGroup") {
        return {
          ...prev,
          itemGroup: value,
          partyId: value === "fg variety" ? prev.partyId : "",
          density: value === "rm film" ? prev.density : "",
        }
      }
      return { ...prev, [field]: value }
    })
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleCreateUom = async (label: string) => {
    const trimmed = label.trim()
    if (!trimmed) return
    try {
      const response = await api.post<{ id: number; uom: string }>("/meta/uoms", { uom: trimmed })
      const value = response.data.uom
      const id = response.data.id
      if (id) setUomMap((prev) => new Map(prev).set(value, id))
      setUomOptions((prev) =>
        prev.some((o) => o.value.toLowerCase() === value.toLowerCase())
          ? prev
          : [...prev, { value, label: value }],
      )
      handleInputChange("uom", value)
    } catch (e) {
      console.error("Failed to create UOM:", e)
    }
  }

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof ItemForm, string>> = {}
    if (!formData.itemCode.trim()) errors.itemCode = "Item code is required"
    if (!formData.itemGroup.trim()) errors.itemGroup = "Item group is required"
    if (!formData.uom.trim()) errors.uom = "Default unit of measure is required"
    if (formData.itemGroup === "rm film" && formData.density.trim()) {
      const densityValue = Number(formData.density)
      if (!Number.isFinite(densityValue) || densityValue <= 0) {
        errors.density = "Enter a valid density"
      }
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    const group = formData.itemGroup.trim()
    if (group === "fg variety") {
      const bomError = validateBomStages(bomStages)
      if (bomError) {
        setError(bomError)
        return
      }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const uomId = getUomId(formData.uom)
      const payload: ItemPayload = {
        itemCode: formData.itemCode.trim(),
        itemName: formData.itemName.trim() || formData.itemCode.trim(),
        itemGroup: group,
        partyId: formData.partyId.trim() ? parseInt(formData.partyId, 10) : undefined,
        density: parseDensity(group, formData.density),
        uomId,
      }
      if (group === "fg variety") {
        payload.bomLines = stageEditorsToPayload(bomStages)
      }

      await createItem(payload)
      navigate("/masters/item", { replace: false })
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Failed to create item. Please try again."
      setError(typeof msg === "string" ? msg : "Failed to create item. Please try again.")
      if (err.response?.status === 400 && String(err.response?.data?.detail).includes("already exists")) {
        setFormErrors({ itemCode: "Item code already exists" })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canCreate) return null

  return (
    <div className="mx-auto max-w-4xl px-6 pb-10 pt-2">
      <div className="mb-6">
        <Button type="button" variant="outline" size="sm" className="mb-4 gap-2" onClick={() => navigate("/masters/item")}>
          <ArrowLeft className="h-4 w-4" />
          Back to items
        </Button>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Add item</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create item master data. For FG variety, add manufacturing stages, structure, and BOM.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Item details</CardTitle>
          <CardDescription>Fields marked * are required.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-itemCode">Item code *</Label>
                <Input
                  id="new-itemCode"
                  ref={firstFieldRef}
                  value={formData.itemCode}
                  onChange={(e) => handleInputChange("itemCode", e.target.value)}
                  placeholder="Enter item code"
                  className={formErrors.itemCode ? "border-red-500" : ""}
                />
                {formErrors.itemCode && <p className="text-sm text-red-500">{formErrors.itemCode}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-itemName">Item name</Label>
                <Input
                  id="new-itemName"
                  value={formData.itemName}
                  onChange={(e) => handleInputChange("itemName", e.target.value)}
                  placeholder="Enter item name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Item group *</Label>
                <CreatableCombobox
                  options={itemGroupOptions}
                  value={formData.itemGroup || null}
                  onValueChange={(value) => handleInputChange("itemGroup", value ?? "")}
                  placeholder="Select item group"
                  searchPlaceholder="Search item group..."
                />
                {formErrors.itemGroup && <p className="text-sm text-red-500">{formErrors.itemGroup}</p>}
              </div>

              {formData.itemGroup === "fg variety" && (
                <div className="space-y-2">
                  <Label>Party</Label>
                  <CreatableCombobox
                    options={partyOptions}
                    value={formData.partyId || null}
                    onValueChange={(value) => handleInputChange("partyId", value ?? "")}
                    placeholder="Select party"
                    searchPlaceholder="Search party..."
                  />
                </div>
              )}

              {formData.itemGroup === "rm film" && (
                <div className="space-y-2">
                  <Label htmlFor="new-density">Density (g/cm³)</Label>
                  <Input
                    id="new-density"
                    type="number"
                    step="any"
                    min="0"
                    value={formData.density}
                    onChange={(e) => handleInputChange("density", e.target.value)}
                    placeholder="e.g. 1.4"
                    className={formErrors.density ? "border-red-500" : ""}
                  />
                  {formErrors.density && <p className="text-sm text-red-500">{formErrors.density}</p>}
                </div>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label>Default unit of measure *</Label>
                <CreatableCombobox
                  options={uomOptions}
                  value={formData.uom || null}
                  onValueChange={(value) => handleInputChange("uom", value ?? "")}
                  onCreateOption={handleCreateUom}
                  placeholder="Select unit of measure"
                  searchPlaceholder="Search unit of measure..."
                  createLabel="Create a new UOM"
                />
                {formErrors.uom && <p className="text-sm text-red-500">{formErrors.uom}</p>}
              </div>
            </div>

            {formData.itemGroup === "fg variety" && (
              <div className="border-t pt-6 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">BOM, structure & routing</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add a manufacturing stage (routing), then define RM items per layer (structure) for that stage.
                  </p>
                </div>
                <FgStageBomEditor value={bomStages} onChange={setBomStages} />
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => navigate("/masters/item")} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Create item"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
