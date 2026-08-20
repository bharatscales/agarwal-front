import { useMemo } from "react"
import { FgBomEditor } from "@/components/fg-bom-editor"
import { groupBomLinesByStage } from "@/components/fg-stage-bom-editor"
import { FG_BOM_NO_RM_OPERATIONS, type BomLine } from "@/lib/item-api"

const NO_RM_SET = new Set<string>(FG_BOM_NO_RM_OPERATIONS)

function noRmMessage(operation: string) {
  if (operation === "Inspection") {
    return "No RM — inspection uses WIP Printing from the prior stage."
  }
  if (operation === "Slitting") {
    return "No RM — slitting uses WIP from the prior stage."
  }
  return "No RM items for this stage."
}

type FgStageBomReadonlyProps = {
  lines: BomLine[]
}

export function FgStageBomReadonly({ lines }: FgStageBomReadonlyProps) {
  const stages = useMemo(() => groupBomLinesByStage(lines), [lines])

  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No BOM defined for this FG variety in Item Master.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {stages.map((stage) => {
        const structureLines = stage.lines.filter((l) => l.rmItemId != null)
        const isNoRm = NO_RM_SET.has(stage.operation) || structureLines.length === 0
        return (
          <div key={`${stage.operation}-${stage.stageSeq}`} className="space-y-2">
            <h4 className="text-sm font-semibold">{stage.label}</h4>
            {isNoRm ? (
              <p className="text-sm text-muted-foreground">{noRmMessage(stage.operation)}</p>
            ) : (
              <FgBomEditor mode="readonly" readonlyLines={structureLines} />
            )}
          </div>
        )
      })}
    </div>
  )
}
