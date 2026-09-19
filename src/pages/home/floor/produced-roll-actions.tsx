import { Pencil, Printer, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"

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
