import { useEffect, useRef, useState } from "react"
import { Plus, RefreshCw, X } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getEnumMasterColumns } from "@/components/columns/enum-master-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import {
  createEnumMasterValue,
  deleteEnumMasterValue,
  getEnumMasterTypes,
  getEnumMasterValues,
  updateEnumMasterValue,
  type EnumMasterType,
  type EnumMasterValue,
} from "@/lib/enum-master-api"

const DEFAULT_ENUM_KEY = "reason_of_wastage"

export default function EnumMaster() {
  const [enumTypes, setEnumTypes] = useState<EnumMasterType[]>([])
  const [selectedEnumKey, setSelectedEnumKey] = useState(DEFAULT_ENUM_KEY)
  const [values, setValues] = useState<EnumMasterValue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addValue, setAddValue] = useState("")
  const [addError, setAddError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [editRow, setEditRow] = useState<EnumMasterValue | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editError, setEditError] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  const enumOptions = enumTypes.map((item) => ({
    value: item.key,
    label: item.label,
  }))
  const selectedLabel =
    enumTypes.find((item) => item.key === selectedEnumKey)?.label || "Select enum"

  const fetchTypes = async () => {
    try {
      const types = await getEnumMasterTypes()
      setEnumTypes(types)
      if (types.length > 0 && !types.some((t) => t.key === selectedEnumKey)) {
        setSelectedEnumKey(types[0].key)
      }
    } catch (err) {
      console.error("Failed to load enum types:", err)
      setEnumTypes([{ key: DEFAULT_ENUM_KEY, label: "Reason of Wastage" }])
    }
  }

  const fetchValues = async (enumKey = selectedEnumKey) => {
    const seq = ++fetchSeq.current
    if (!enumKey) {
      setValues([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const data = await getEnumMasterValues(enumKey)
      if (seq !== fetchSeq.current) return
      setValues(data)
    } catch (err) {
      if (seq !== fetchSeq.current) return
      console.error("Failed to load enum values:", err)
      setError("Failed to fetch enum values. Please try again.")
    } finally {
      if (seq === fetchSeq.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchTypes()
  }, [])

  useEffect(() => {
    void fetchValues(selectedEnumKey)
  }, [selectedEnumKey])

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = addValue.trim()
    if (!trimmed) {
      setAddError("Value is required")
      return
    }
    setIsSaving(true)
    createEnumMasterValue(selectedEnumKey, trimmed)
      .then((created) => {
        setValues((prev) =>
          [...prev.filter((row) => row.id !== created.id), created].sort((a, b) =>
            a.value.localeCompare(b.value)
          )
        )
        setIsAddOpen(false)
        setAddValue("")
        setAddError(null)
      })
      .catch((err) => {
        setAddError(err.response?.data?.detail || "Failed to add value.")
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editRow) return
    const trimmed = editValue.trim()
    if (!trimmed) {
      setEditError("Value is required")
      return
    }
    setIsSaving(true)
    updateEnumMasterValue(editRow.id, trimmed)
      .then((updated) => {
        setValues((prev) =>
          prev
            .map((row) => (row.id === updated.id ? updated : row))
            .sort((a, b) => a.value.localeCompare(b.value))
        )
        setEditRow(null)
        setEditValue("")
        setEditError(null)
      })
      .catch((err) => {
        setEditError(err.response?.data?.detail || "Failed to update value.")
      })
      .finally(() => {
        setIsSaving(false)
      })
  }

  const handleDelete = (row: EnumMasterValue) => {
    if (!window.confirm(`Delete "${row.value}"? This cannot be undone.`)) return
    deleteEnumMasterValue(row.id)
      .then(() => {
        setValues((prev) => prev.filter((item) => item.id !== row.id))
      })
      .catch((err) => {
        console.error("Failed to delete enum value:", err)
        setError(err.response?.data?.detail || "Failed to delete value.")
      })
  }

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Enum Master</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Add, edit, and remove values for dropdowns used across the floor.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => void fetchValues()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button onClick={() => { setAddValue(""); setAddError(null); setIsAddOpen(true) }} size="sm" disabled={!selectedEnumKey}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Value</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 max-w-md space-y-2">
        <Label>Enum</Label>
        <CreatableCombobox
          options={enumOptions}
          value={selectedEnumKey || null}
          onValueChange={(value) => {
            if (value && enumOptions.some((option) => option.value === value)) {
              setSelectedEnumKey(value)
            }
          }}
          placeholder="Select enum"
          searchPlaceholder="Search enum..."
          emptyMessage="No enums found."
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading values...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Values
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={() => void fetchValues()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      ) : values.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No values for {selectedLabel}. Add the first value to get started.
          </p>
        </div>
      ) : (
        <DataTable
          columns={getEnumMasterColumns({
            onEdit: (row) => {
              setEditRow(row)
              setEditValue(row.value)
              setEditError(null)
            },
            onDelete: handleDelete,
          })}
          data={values}
        />
      )}

      {isAddOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Add Value</CardTitle>
                <CardDescription>New value for {selectedLabel}.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleAdd}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="enum-value">Value *</Label>
                  <Input
                    id="enum-value"
                    autoFocus
                    value={addValue}
                    onChange={(e) => {
                      setAddValue(e.target.value)
                      if (addError) setAddError(null)
                    }}
                    placeholder="Enter value"
                    className={addError ? "border-red-500" : ""}
                  />
                  {addError && <p className="text-sm text-red-500">{addError}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 mt-6">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {editRow && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>Edit Value</CardTitle>
                <CardDescription>Update this {selectedLabel} value.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditRow(null)} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleEdit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-enum-value">Value *</Label>
                  <Input
                    id="edit-enum-value"
                    autoFocus
                    value={editValue}
                    onChange={(e) => {
                      setEditValue(e.target.value)
                      if (editError) setEditError(null)
                    }}
                    placeholder="Enter value"
                    className={editError ? "border-red-500" : ""}
                  />
                  {editError && <p className="text-sm text-red-500">{editError}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 mt-6">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditRow(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSaving}>
                  {isSaving ? "Saving…" : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
