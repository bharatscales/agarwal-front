import { Pencil, Printer, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export const producedRollEditDialogClassName =
  "sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card text-card-foreground border-border"

export const producedRollEditInputClassName =
  "h-7 w-20 px-1.5 text-xs text-foreground dark:bg-input/50 dark:text-foreground"

export function ProducedRollEditField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

export function isProducedRollLocked(row: { consumed?: boolean; issued?: boolean }) {
  return Boolean(row.consumed || row.issued)
}

export const PRODUCED_ROLL_DELETE_CONFIRM =
  "Delete this produced roll? If it is the last produced roll from the loaded parent, its leftover balance roll will also be deleted."

type ProducedRollRowActionsProps = {
  reprintDisabled?: boolean
  mutateDisabled?: boolean
  onReprint?: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ProducedRollRowActions({
  reprintDisabled,
  mutateDisabled,
  onReprint,
  onEdit,
  onDelete,
}: ProducedRollRowActionsProps) {
  return (
    <div className="flex items-center justify-center gap-0.5">
      {onReprint ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={reprintDisabled}
          title="Reprint"
          onClick={onReprint}
        >
          <Printer className="h-4 w-4" />
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="icon" disabled={mutateDisabled} title="Edit" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" disabled={mutateDisabled} title="Delete" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
