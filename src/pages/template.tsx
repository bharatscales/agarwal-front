import { useEffect, useRef, useState } from "react"
import { ArrowRight, Plus, RefreshCw, X, Trash2 } from "lucide-react"
import { DataTable } from "@/components/data-table"
import { getTemplateMasterColumns, type TemplateMaster } from "@/components/columns/template-master-columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTemplate, deleteTemplate, getAllTemplates, updateTemplate } from "@/lib/template-api"
import { useAuth } from "@/contexts/AuthContext"

type TemplateForm = {
  name: string
  fileType: string
  templateJsonArray: string[]
  defaultForm: string
}

const fileTypeOptions = [
  { value: "ZPL", label: "ZPL" },
  { value: "PDF", label: "PDF" },
]

const defaultFormOptions = [
  { value: "stock_roll_stk", label: "Stock Roll STK" },
  { value: "stock_ink_stk", label: "Stock Ink STK" },
]

// Variables available for each default form type
const formVariables: Record<string, string[]> = {
  stock_roll_stk: [
    "itemCode",
    "itemName",
    "rollno",
    "size",
    "micron",
    "netweight",
    "grossweight",
    "barcode",
    "stockVoucher.id",
    "stockVoucher.vendor",
    "stockVoucher.vendorId",
    "stockVoucher.invoiceNo",
    "stockVoucher.invoiceDate",
    "stockVoucher.stockType",
  ],
  stock_ink_stk: [
    "itemCode",
    "itemName",
    "barcode",
    "quantity",
    "unit",
    "stockVoucher.id",
    "stockVoucher.vendor",
    "stockVoucher.vendorId",
    "stockVoucher.invoiceNo",
    "stockVoucher.invoiceDate",
    "stockVoucher.stockType",
  ],
}

// Helper function to generate JSON template based on type
const generateJsonTemplate = (type: string, fileType: string): string => {
  if (fileType === "ZPL") {
    switch (type) {
      case "simple_text":
        return JSON.stringify({
          type: "Normal",
          x: 50,
          y: 50,
          font_size: 60,
          data: "your data"
        }, null, 2)
      case "field_block":
        return JSON.stringify({
          type: "FB",
          x: 50,
          y: 50,
          width: 700,
          font_size: 60,
          align: "C",
          data: "your data"
        }, null, 2)
      case "qr_code":
        return JSON.stringify({
          type: "BC",
          x: 50,
          y: 50,
          magnification: 5,
          data: "your data"
        }, null, 2)
      case "image":
        return JSON.stringify({
          type: "GF",
          x: 50,
          y: 50,
          data: "your image code"
        }, null, 2)
      default:
        return ""
    }
  } else if (fileType === "PDF") {
    // PDF templates will be designed later
    switch (type) {
      case "text":
        return JSON.stringify({
          type: "text",
          // Will be designed later
        }, null, 2)
      case "table":
        return JSON.stringify({
          type: "table",
          // Will be designed later
        }, null, 2)
      case "total":
        return JSON.stringify({
          type: "total",
          // Will be designed later
        }, null, 2)
      default:
        return ""
    }
  }
  return ""
}

export default function Template() {
  const { user } = useAuth()
  const isSuperUser = user?.role === "superuser"
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false)
  const [isEditTemplateOpen, setIsEditTemplateOpen] = useState(false)
  const [editTemplateId, setEditTemplateId] = useState<number | null>(null)
  const [formData, setFormData] = useState<TemplateForm>({
    name: "",
    fileType: "",
    templateJsonArray: [],
    defaultForm: "",
  })
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TemplateForm, string>>>({})
  const [templates, setTemplates] = useState<TemplateMaster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<TemplateForm>({
    name: "",
    fileType: "",
    templateJsonArray: [],
    defaultForm: "",
  })
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof TemplateForm, string>>>({})
  const [templateSelectValue, setTemplateSelectValue] = useState<string>("")
  const [editTemplateSelectValue, setEditTemplateSelectValue] = useState<string>("")
  const [draggedVariable, setDraggedVariable] = useState<string>("")
  const [dragOverTextareaIndex, setDragOverTextareaIndex] = useState<number | null>(null)
  const [dragOverEditTextareaIndex, setDragOverEditTextareaIndex] = useState<number | null>(null)
  const addFieldRefs = useRef<Array<HTMLInputElement | HTMLButtonElement | null>>([])

  const handleRefresh = () => {
    fetchTemplates()
  }

  const handleAddTemplate = () => {
    setIsAddTemplateOpen(true)
  }

  const handleEditTemplateOpen = (template: TemplateMaster) => {
    setEditTemplateId(template.id)
    setEditFormData({
      name: template.name,
      fileType: template.fileType,
      templateJsonArray: template.template && Array.isArray(template.template)
        ? template.template.map(item => JSON.stringify(item, null, 2))
        : template.template
        ? [JSON.stringify(template.template, null, 2)]
        : [],
      defaultForm: template.defaultForm || "",
    })
    setEditErrors({})
    setIsEditTemplateOpen(true)
  }

  const handleInputChange = (field: keyof TemplateForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleEditInputChange = (field: keyof TemplateForm, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: undefined }))
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
    const errors: Partial<Record<keyof TemplateForm, string>> = {}

    if (!formData.name.trim()) {
      errors.name = "Name is required"
    }
    if (templates.some(template => template.name === formData.name.trim())) {
      errors.name = "Template name already exists"
    }
    if (!formData.fileType.trim()) {
      errors.fileType = "File type is required"
    }
    // Validate each JSON object in the array
    formData.templateJsonArray.forEach((jsonStr, index) => {
      if (jsonStr.trim()) {
        try {
          JSON.parse(jsonStr.trim())
        } catch (e) {
          errors.templateJsonArray = `Invalid JSON format at item ${index + 1}`
        }
      }
    })

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateEditForm = (): boolean => {
    const errors: Partial<Record<keyof TemplateForm, string>> = {}

    if (!editFormData.name.trim()) {
      errors.name = "Name is required"
    }
    if (
      templates.some(
        template =>
          template.name === editFormData.name.trim() &&
          template.id !== editTemplateId
      )
    ) {
      errors.name = "Template name already exists"
    }
    if (!editFormData.fileType.trim()) {
      errors.fileType = "File type is required"
    }
    // Validate each JSON object in the array
    editFormData.templateJsonArray.forEach((jsonStr, index) => {
      if (jsonStr.trim()) {
        try {
          JSON.parse(jsonStr.trim())
        } catch (e) {
          errors.templateJsonArray = `Invalid JSON format at item ${index + 1}`
        }
      }
    })

    setEditErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    // Parse all JSON objects in the array
    const templateDataArray: Record<string, any>[] = []
    for (const jsonStr of formData.templateJsonArray) {
      if (jsonStr.trim()) {
        try {
          templateDataArray.push(JSON.parse(jsonStr.trim()))
        } catch (e) {
          setFormErrors({ templateJsonArray: "Invalid JSON format" })
          return
        }
      }
    }

    createTemplate({
      name: formData.name.trim(),
      file_type: formData.fileType.trim(),
      template: templateDataArray.length > 0 ? templateDataArray : null,
      default_form: formData.defaultForm.trim() || null,
    })
      .then((newTemplate) => {
        setTemplates(prev => [newTemplate, ...prev])
        setFormData({
          name: "",
          fileType: "",
          templateJsonArray: [],
          defaultForm: "",
        })
        setFormErrors({})
        setIsAddTemplateOpen(false)
      })
      .catch((err) => {
        console.error("Error creating template:", err)
        const errorMessage = err.response?.data?.detail || "Failed to create template. Please try again."
        setFormErrors({ name: errorMessage })
      })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTemplateId || !validateEditForm()) return

    // Parse all JSON objects in the array
    const templateDataArray: Record<string, any>[] = []
    for (const jsonStr of editFormData.templateJsonArray) {
      if (jsonStr.trim()) {
        try {
          templateDataArray.push(JSON.parse(jsonStr.trim()))
        } catch (e) {
          setEditErrors({ templateJsonArray: "Invalid JSON format" })
          return
        }
      }
    }

    updateTemplate(editTemplateId, {
      name: editFormData.name.trim(),
      file_type: editFormData.fileType.trim(),
      template: templateDataArray.length > 0 ? templateDataArray : null,
      default_form: editFormData.defaultForm.trim() || null,
    })
      .then((updatedTemplate) => {
        setTemplates(prev =>
          prev.map(template => (template.id === updatedTemplate.id ? updatedTemplate : template))
        )
        handleCloseEditModal()
      })
      .catch((err) => {
        console.error("Error updating template:", err)
        const errorMessage = err.response?.data?.detail || "Failed to update template. Please try again."
        setEditErrors({ name: errorMessage })
      })
  }

  const handleDeleteTemplate = (template: TemplateMaster) => {
    if (!window.confirm(`Delete template "${template.name}"? This cannot be undone.`)) {
      return
    }
    deleteTemplate(template.id)
      .then(() => {
        setTemplates(prev => prev.filter(row => row.id !== template.id))
      })
      .catch((err) => {
        console.error("Error deleting template:", err)
        setError("Failed to delete template. Please try again.")
      })
  }

  const handleCloseModal = () => {
    setIsAddTemplateOpen(false)
    setFormData({
      name: "",
      fileType: "",
      templateJsonArray: [],
      defaultForm: "",
    })
    setFormErrors({})
  }

  const handleCloseEditModal = () => {
    setIsEditTemplateOpen(false)
    setEditTemplateId(null)
    setEditFormData({
      name: "",
      fileType: "",
      templateJsonArray: [],
      defaultForm: "",
    })
    setEditErrors({})
  }

  const handleRemoveJsonField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      templateJsonArray: prev.templateJsonArray.filter((_, i) => i !== index)
    }))
  }

  const handleJsonFieldChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      templateJsonArray: prev.templateJsonArray.map((item, i) => i === index ? value : item)
    }))
    if (formErrors.templateJsonArray) {
      setFormErrors(prev => ({ ...prev, templateJsonArray: undefined }))
    }
  }

  const handleEditRemoveJsonField = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      templateJsonArray: prev.templateJsonArray.filter((_, i) => i !== index)
    }))
  }

  const handleEditJsonFieldChange = (index: number, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      templateJsonArray: prev.templateJsonArray.map((item, i) => i === index ? value : item)
    }))
    if (editErrors.templateJsonArray) {
      setEditErrors(prev => ({ ...prev, templateJsonArray: undefined }))
    }
  }

  const handleDragStart = (variable: string) => {
    setDraggedVariable(variable)
  }

  const handleDragEnd = () => {
    setDraggedVariable("")
    setDragOverTextareaIndex(null)
    setDragOverEditTextareaIndex(null)
  }

  const handleDragOver = (e: React.DragEvent, index: number, isEdit: boolean = false) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    if (isEdit) {
      setDragOverEditTextareaIndex(index)
    } else {
      setDragOverTextareaIndex(index)
    }

    // Calculate and set cursor position in real-time
    if (draggedVariable) {
      const textarea = e.currentTarget as HTMLTextAreaElement
      const insertPosition = getTextPositionFromCoordinates(
        textarea,
        e.clientX,
        e.clientY
      )
      
      // Set cursor position to show where it will be inserted
      textarea.focus()
      textarea.setSelectionRange(insertPosition, insertPosition)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the textarea (not just moving to a child element)
    const relatedTarget = e.relatedTarget as HTMLElement
    const textarea = e.currentTarget as HTMLTextAreaElement
    
    if (!textarea.contains(relatedTarget)) {
      setDragOverTextareaIndex(null)
      setDragOverEditTextareaIndex(null)
      // Clear selection when leaving
      textarea.setSelectionRange(textarea.selectionStart, textarea.selectionStart)
    }
  }

  // Helper function to calculate text position from mouse coordinates
  const getTextPositionFromCoordinates = (
    textarea: HTMLTextAreaElement,
    x: number,
    y: number
  ): number => {
    const rect = textarea.getBoundingClientRect()
    const relativeX = x - rect.left
    const relativeY = y - rect.top

    // Account for padding and border
    const style = window.getComputedStyle(textarea)
    const paddingLeft = parseFloat(style.paddingLeft) || 0
    const paddingTop = parseFloat(style.paddingTop) || 0
    const borderLeft = parseFloat(style.borderLeftWidth) || 0
    const borderTop = parseFloat(style.borderTopWidth) || 0

    // Account for scroll position
    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft

    // Adjust coordinates for scroll and padding/border
    const adjustedX = Math.max(0, relativeX - paddingLeft - borderLeft + scrollLeft)
    const adjustedY = Math.max(0, relativeY - paddingTop - borderTop + scrollTop)

    // Get textarea properties
    const text = textarea.value
    const lines = text.split('\n')
    
    // Create a temporary div to measure line height accurately
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.visibility = 'hidden'
    tempDiv.style.whiteSpace = 'pre'
    tempDiv.style.font = style.font
    tempDiv.style.fontSize = style.fontSize
    tempDiv.style.fontFamily = style.fontFamily
    tempDiv.style.padding = '0'
    tempDiv.style.margin = '0'
    tempDiv.style.width = '1px'
    tempDiv.style.height = 'auto'
    tempDiv.textContent = 'M'
    document.body.appendChild(tempDiv)
    
    // Get actual line height
    const lineHeight = tempDiv.offsetHeight || parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2
    document.body.removeChild(tempDiv)
    
    // Calculate which line we're on (accounting for scroll)
    const lineIndex = Math.max(0, Math.min(Math.floor(adjustedY / lineHeight), lines.length - 1))
    
    // Get the line text
    const lineText = lines[lineIndex] || ''
    
    // Create a temporary span to measure character widths
    const tempSpan = document.createElement('span')
    tempSpan.style.position = 'absolute'
    tempSpan.style.visibility = 'hidden'
    tempSpan.style.whiteSpace = 'pre'
    tempSpan.style.font = style.font
    tempSpan.style.fontSize = style.fontSize
    tempSpan.style.fontFamily = style.fontFamily
    tempSpan.style.padding = '0'
    tempSpan.style.margin = '0'
    document.body.appendChild(tempSpan)

    // Find the character position in the line (accounting for scroll)
    let charPosition = 0
    
    for (let i = 0; i <= lineText.length; i++) {
      tempSpan.textContent = lineText.substring(0, i)
      const width = tempSpan.offsetWidth
      
      if (width > adjustedX) {
        // Find the closest character
        if (i > 0) {
          const prevWidth = (() => {
            tempSpan.textContent = lineText.substring(0, i - 1)
            return tempSpan.offsetWidth
          })()
          const midPoint = prevWidth + (width - prevWidth) / 2
          charPosition = adjustedX < midPoint ? i - 1 : i
        } else {
          charPosition = i
        }
        break
      }
      charPosition = i
    }

    document.body.removeChild(tempSpan)

    // Calculate the absolute position in the text
    let absolutePosition = 0
    for (let i = 0; i < lineIndex; i++) {
      absolutePosition += lines[i].length + 1 // +1 for newline
    }
    absolutePosition += charPosition

    return Math.max(0, Math.min(absolutePosition, text.length))
  }

  const handleDrop = (e: React.DragEvent, index: number, isEdit: boolean = false) => {
    e.preventDefault()
    if (!draggedVariable) return

    const variableText = `{{${draggedVariable}}}`
    const textarea = e.currentTarget as HTMLTextAreaElement
    
    // Calculate position based on mouse coordinates
    const insertPosition = getTextPositionFromCoordinates(
      textarea,
      e.clientX,
      e.clientY
    )
    
    const currentValue = isEdit ? editFormData.templateJsonArray[index] : formData.templateJsonArray[index]
    const newValue = currentValue.substring(0, insertPosition) + variableText + currentValue.substring(insertPosition)

    if (isEdit) {
      handleEditJsonFieldChange(index, newValue)
    } else {
      handleJsonFieldChange(index, newValue)
    }

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(insertPosition + variableText.length, insertPosition + variableText.length)
    }, 0)

    handleDragEnd()
  }

  const handleAddJsonFromTemplate = (templateType: string) => {
    if (!formData.fileType) {
      setFormErrors(prev => ({ ...prev, fileType: "Please select file type first" }))
      return
    }
    const jsonTemplate = generateJsonTemplate(templateType, formData.fileType)
    if (jsonTemplate) {
      setFormData(prev => ({
        ...prev,
        templateJsonArray: [...prev.templateJsonArray, jsonTemplate]
      }))
      // Reset select after adding
      setTemplateSelectValue("")
    }
  }

  const handleEditAddJsonFromTemplate = (templateType: string) => {
    if (!editFormData.fileType) {
      setEditErrors(prev => ({ ...prev, fileType: "Please select file type first" }))
      return
    }
    const jsonTemplate = generateJsonTemplate(templateType, editFormData.fileType)
    if (jsonTemplate) {
      setEditFormData(prev => ({
        ...prev,
        templateJsonArray: [...prev.templateJsonArray, jsonTemplate]
      }))
      // Reset select after adding
      setEditTemplateSelectValue("")
    }
  }

  useEffect(() => {
    if (isAddTemplateOpen) {
      requestAnimationFrame(() => {
        addFieldRefs.current[0]?.focus()
      })
    }
  }, [isAddTemplateOpen])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await getAllTemplates()
      setTemplates(data)
    } catch (err: any) {
      console.error("Error fetching templates:", err)
      setError("Failed to fetch templates. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return (
    <div className="px-6 pt-2 pb-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Template</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Manage template master data.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {isSuperUser && (
              <Button onClick={handleAddTemplate} size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Template</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
              Error Loading Templates
            </h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <DataTable
            columns={getTemplateMasterColumns({
              onEdit: handleEditTemplateOpen,
              onDelete: handleDeleteTemplate,
              isSuperUser: isSuperUser,
            })}
            data={templates}
          />
        </div>
      )}

      {templates.length === 0 && !isLoading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No templates found. Create your first template to get started.
          </p>
        </div>
      )}

      {isAddTemplateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <div className="flex flex-row items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold">Add New Template</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Create a new template with basic details.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Variables Panel - Left Side */}
              {formData.defaultForm && formVariables[formData.defaultForm] && (
                <div className="w-80 border-r bg-gray-50 dark:bg-gray-800/50 flex flex-col flex-shrink-0">
                  <div className="p-4 border-b">
                    <Label className="text-sm font-semibold">Available Variables</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Drag variables into JSON fields
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-wrap gap-2">
                      {formVariables[formData.defaultForm].map((variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          draggable
                          onDragStart={() => handleDragStart(variable)}
                          onDragEnd={handleDragEnd}
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Panel - Right Side */}
              <div className="flex-1 flex flex-col min-w-0">
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      ref={(el) => {
                        addFieldRefs.current[0] = el
                      }}
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      onKeyDown={(e) => handleEnterKey(e, 0)}
                      placeholder="Enter template name"
                      className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && (
                      <p className="text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fileType">File Type *</Label>
                    <Select
                      value={formData.fileType}
                      onValueChange={(value) =>
                        handleInputChange("fileType", value)
                      }
                    >
                      <SelectTrigger
                        id="fileType"
                        ref={(el) => {
                          addFieldRefs.current[1] = el
                        }}
                        onKeyDown={(e) => handleEnterKey(e, 1)}
                        className={formErrors.fileType ? "border-red-500" : ""}
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fileTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.fileType && (
                      <p className="text-sm text-red-500">{formErrors.fileType}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultForm">Default Form (Optional)</Label>
                  <Select
                    value={formData.defaultForm || undefined}
                    onValueChange={(value) => {
                      // Handle clearing: if value is "__clear__", set to empty string
                      handleInputChange("defaultForm", value === "__clear__" ? "" : value)
                    }}
                  >
                    <SelectTrigger
                      id="defaultForm"
                      className={formErrors.defaultForm ? "border-red-500" : ""}
                      icon={ArrowRight}
                    >
                      <SelectValue placeholder="Select default form" />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.defaultForm && (
                        <SelectItem value="__clear__">Clear selection</SelectItem>
                      )}
                      {defaultFormOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.defaultForm && (
                    <p className="text-sm text-red-500">{formErrors.defaultForm}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Template (Optional)</Label>
                    {formData.fileType && (
                      <Select
                        value={templateSelectValue}
                        onValueChange={(value) => {
                          setTemplateSelectValue(value)
                          handleAddJsonFromTemplate(value)
                        }}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Add template" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.fileType === "ZPL" ? (
                            <>
                              <SelectItem value="simple_text">Simple Text</SelectItem>
                              <SelectItem value="field_block">Field Block</SelectItem>
                              <SelectItem value="qr_code">QR Code</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </>
                          ) : formData.fileType === "PDF" ? (
                            <>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="table">Table</SelectItem>
                              <SelectItem value="total">Total</SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {formData.templateJsonArray.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No templates added. Use the dropdown above to add templates.
                      </p>
                    ) : (
                      formData.templateJsonArray.map((jsonStr, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`templateJson-${index}`} className="text-sm">
                              Template {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveJsonField(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            id={`templateJson-${index}`}
                            value={jsonStr}
                            onChange={(e) => handleJsonFieldChange(index, e.target.value)}
                            onDragOver={(e) => handleDragOver(e, index, false)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, false)}
                            onDragEnter={(e) => {
                              e.preventDefault()
                              const textarea = e.currentTarget as HTMLTextAreaElement
                              textarea.focus()
                            }}
                            placeholder='Enter JSON object, e.g., {"key": "value"}'
                            className={`${formErrors.templateJsonArray ? "border-red-500" : ""} ${dragOverTextareaIndex === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                            rows={4}
                          />
                        </div>
                      ))
                    )}
                  </div>
                  {formErrors.templateJsonArray && (
                    <p className="text-sm text-red-500">{formErrors.templateJsonArray}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter valid JSON objects. Each field represents one JSON object in the array. Leave empty if not needed.
                  </p>
                </div>
                  </div>

                  <div className="flex gap-2 p-6 border-t flex-shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Save Template
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditTemplateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-6xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            <div className="flex flex-row items-center justify-between p-6 border-b flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold">Edit Template</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Update the template details.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseEditModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Variables Panel - Left Side */}
              {editFormData.defaultForm && formVariables[editFormData.defaultForm] && (
                <div className="w-80 border-r bg-gray-50 dark:bg-gray-800/50 flex flex-col flex-shrink-0">
                  <div className="p-4 border-b">
                    <Label className="text-sm font-semibold">Available Variables</Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Drag variables into JSON fields
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex flex-wrap gap-2">
                      {formVariables[editFormData.defaultForm].map((variable) => (
                        <Badge
                          key={variable}
                          variant="outline"
                          className="text-xs cursor-grab active:cursor-grabbing hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          draggable
                          onDragStart={() => handleDragStart(variable)}
                          onDragEnd={handleDragEnd}
                        >
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Panel - Right Side */}
              <div className="flex-1 flex flex-col min-w-0">
                <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name *</Label>
                    <Input
                      id="edit-name"
                      value={editFormData.name}
                      onChange={(e) => handleEditInputChange("name", e.target.value)}
                      placeholder="Enter template name"
                      className={editErrors.name ? "border-red-500" : ""}
                    />
                    {editErrors.name && (
                      <p className="text-sm text-red-500">{editErrors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-fileType">File Type *</Label>
                    <Select
                      value={editFormData.fileType}
                      onValueChange={(value) =>
                        handleEditInputChange("fileType", value)
                      }
                    >
                      <SelectTrigger
                        id="edit-fileType"
                        className={editErrors.fileType ? "border-red-500" : ""}
                        icon={ArrowRight}
                      >
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fileTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {editErrors.fileType && (
                      <p className="text-sm text-red-500">{editErrors.fileType}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-defaultForm">Default Form (Optional)</Label>
                  <Select
                    value={editFormData.defaultForm || undefined}
                    onValueChange={(value) => {
                      // Handle clearing: if value is "__clear__", set to empty string
                      handleEditInputChange("defaultForm", value === "__clear__" ? "" : value)
                    }}
                  >
                    <SelectTrigger
                      id="edit-defaultForm"
                      className={editErrors.defaultForm ? "border-red-500" : ""}
                      icon={ArrowRight}
                    >
                      <SelectValue placeholder="Select default form" />
                    </SelectTrigger>
                    <SelectContent>
                      {editFormData.defaultForm && (
                        <SelectItem value="__clear__">Clear selection</SelectItem>
                      )}
                      {defaultFormOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {editErrors.defaultForm && (
                    <p className="text-sm text-red-500">{editErrors.defaultForm}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Template (Optional)</Label>
                    {editFormData.fileType && (
                      <Select
                        value={editTemplateSelectValue}
                        onValueChange={(value) => {
                          setEditTemplateSelectValue(value)
                          handleEditAddJsonFromTemplate(value)
                        }}
                      >
                        <SelectTrigger className="h-8 w-40">
                          <SelectValue placeholder="Add template" />
                        </SelectTrigger>
                        <SelectContent>
                          {editFormData.fileType === "ZPL" ? (
                            <>
                              <SelectItem value="simple_text">Simple Text</SelectItem>
                              <SelectItem value="field_block">Field Block</SelectItem>
                              <SelectItem value="qr_code">QR Code</SelectItem>
                              <SelectItem value="image">Image</SelectItem>
                            </>
                          ) : editFormData.fileType === "PDF" ? (
                            <>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="table">Table</SelectItem>
                              <SelectItem value="total">Total</SelectItem>
                            </>
                          ) : null}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {editFormData.templateJsonArray.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                        No templates added. Use the dropdown above to add templates.
                      </p>
                    ) : (
                      editFormData.templateJsonArray.map((jsonStr, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`edit-templateJson-${index}`} className="text-sm">
                              Object {index + 1}
                            </Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRemoveJsonField(index)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Textarea
                            id={`edit-templateJson-${index}`}
                            value={jsonStr}
                            onChange={(e) => handleEditJsonFieldChange(index, e.target.value)}
                            onDragOver={(e) => handleDragOver(e, index, true)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index, true)}
                            onDragEnter={(e) => {
                              e.preventDefault()
                              const textarea = e.currentTarget as HTMLTextAreaElement
                              textarea.focus()
                            }}
                            placeholder='Enter JSON object, e.g., {"key": "value"}'
                            className={`${editErrors.templateJsonArray ? "border-red-500" : ""} ${dragOverEditTextareaIndex === index ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                            rows={4}
                          />
                        </div>
                      ))
                    )}
                  </div>
                  {editErrors.templateJsonArray && (
                    <p className="text-sm text-red-500">{editErrors.templateJsonArray}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Enter valid JSON objects. Each field represents one JSON object in the array. Leave empty if not needed.
                  </p>
                </div>
                  </div>

                  <div className="flex gap-2 p-6 border-t flex-shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseEditModal}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

