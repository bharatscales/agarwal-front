import { Input } from "@/components/ui/input"

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === "") return null
  const parsed = parseFloat(trimmed)
  return Number.isNaN(parsed) ? null : parsed
}

export function sanitizeNonNegativeDecimalInput(raw: string): string {
  let result = ""
  let hasDot = false
  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      result += char
    } else if (char === "." && !hasDot) {
      result += char
      hasDot = true
    }
  }
  return result
}

export function parseNonNegativeDecimal(raw: string): number | null {
  const parsed = parseOptionalNumber(sanitizeNonNegativeDecimalInput(raw))
  if (parsed == null || parsed < 0) return null
  return parsed
}

export function hasSemiConsumeChoice(balanceRaw: string | undefined, semiConsumed?: boolean): boolean {
  if (semiConsumed) return true
  return parseNonNegativeDecimal(balanceRaw || "") != null
}

export function NonNegativeDecimalInput({
  value,
  disabled,
  className,
  onValueChange,
  onValueBlur,
}: {
  value: string
  disabled?: boolean
  className?: string
  onValueChange: (value: string) => void
  onValueBlur?: (value: string) => void
}) {
  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className ?? "h-7 w-20 px-1.5 text-xs"}
      disabled={disabled}
      value={value}
      onChange={(e) => onValueChange(sanitizeNonNegativeDecimalInput(e.target.value))}
      onBlur={
        onValueBlur
          ? (e) => {
              const sanitized = sanitizeNonNegativeDecimalInput(e.currentTarget.value)
              onValueBlur(sanitized === "." ? "" : sanitized)
            }
          : undefined
      }
    />
  )
}
