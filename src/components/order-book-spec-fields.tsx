import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type OrderBookSpecFieldsValue = {
  totalGsm: string
  size: string
  structure: string
  coilWidth: string
  repeatLength: string
  noOfPanel: string
}

type Props = {
  value: OrderBookSpecFieldsValue
  onChange: (field: keyof OrderBookSpecFieldsValue, value: string) => void
  idPrefix?: string
  fieldRefs?: Array<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | null>
  startIndex?: number
  onEnterKey?: (
    event: React.KeyboardEvent<HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement>,
    index: number
  ) => void
}

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function parseOptionalInt(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

export function OrderBookSpecFields({
  value,
  onChange,
  idPrefix = "",
  fieldRefs,
  startIndex = 0,
  onEnterKey,
}: Props) {
  const bindRef = (offset: number) => (el: HTMLInputElement | null) => {
    if (!fieldRefs) return
    fieldRefs[startIndex + offset] = el
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}totalGsm`}>Total GSM</Label>
          <Input
            id={`${idPrefix}totalGsm`}
            type="number"
            step="any"
            min="0"
            ref={bindRef(0)}
            value={value.totalGsm}
            onChange={(e) => onChange("totalGsm", e.target.value)}
            onKeyDown={(e) => onEnterKey?.(e, startIndex)}
            placeholder="From FG BOM"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}size`}>Size</Label>
          <Input
            id={`${idPrefix}size`}
            type="number"
            step="any"
            min="0"
            ref={bindRef(1)}
            value={value.size}
            onChange={(e) => onChange("size", e.target.value)}
            onKeyDown={(e) => onEnterKey?.(e, startIndex + 1)}
            placeholder="From FG BOM"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}structure`}>Structure</Label>
        <Input
          id={`${idPrefix}structure`}
          ref={bindRef(2)}
          value={value.structure}
          onChange={(e) => onChange("structure", e.target.value)}
          onKeyDown={(e) => onEnterKey?.(e, startIndex + 2)}
          placeholder="From FG BOM layers"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}coilWidth`}>Coil width</Label>
          <Input
            id={`${idPrefix}coilWidth`}
            type="number"
            step="any"
            min="0"
            ref={bindRef(3)}
            value={value.coilWidth}
            onChange={(e) => onChange("coilWidth", e.target.value)}
            onKeyDown={(e) => onEnterKey?.(e, startIndex + 3)}
            placeholder="Enter coil width"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}repeatLength`}>Repeat length</Label>
          <Input
            id={`${idPrefix}repeatLength`}
            type="number"
            step="any"
            min="0"
            ref={bindRef(4)}
            value={value.repeatLength}
            onChange={(e) => onChange("repeatLength", e.target.value)}
            onKeyDown={(e) => onEnterKey?.(e, startIndex + 4)}
            placeholder="Enter repeat length"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}noOfPanel`}>No of Panel</Label>
          <Input
            id={`${idPrefix}noOfPanel`}
            type="number"
            step="1"
            min="0"
            ref={bindRef(5)}
            value={value.noOfPanel}
            onChange={(e) => onChange("noOfPanel", e.target.value)}
            onKeyDown={(e) => onEnterKey?.(e, startIndex + 5)}
            placeholder="Enter no of panel"
          />
        </div>
      </div>
    </div>
  )
}
