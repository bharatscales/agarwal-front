import type { WorkOrderStageTrack, WorkOrderTrack } from "@/lib/work-order-api"

const SHORT_LABEL: Record<string, string> = {
  Printing: "Print",
  Inspection: "Insp",
  ECL: "ECL",
  Lamination: "Lam",
  Slitting: "Slit",
}

const EMPTY_STAGES: WorkOrderStageTrack[] = [
  { operation: "Printing", state: "not_started", rolls: 0, weight: 0 },
  { operation: "Inspection", state: "not_started", rolls: 0, weight: 0 },
  { operation: "ECL", state: "not_started", rolls: 0, weight: 0 },
  { operation: "Lamination", state: "not_started", rolls: 0, weight: 0 },
  { operation: "Slitting", state: "not_started", rolls: 0, weight: 0 },
]

function formatWeightKg(weight: number): string {
  const rounded = Math.round(weight * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

const WIP_BIN: Record<string, string> = {
  Printing: "WIP Printing",
  Inspection: "WIP Inspection",
  ECL: "WIP ECL",
  Lamination: "WIP Lamination",
}

function stageTitle(stage: WorkOrderStageTrack): string {
  if (stage.state === "skipped") return `${stage.operation}: skipped`
  const stateLabel =
    stage.state === "completed" ? "completed" : stage.state === "in_process" ? "in process" : "not started"
  const bin = WIP_BIN[stage.operation]
  if (bin && stage.rolls > 0) {
    const rollsLabel = stage.rolls === 1 ? "roll" : "rolls"
    return `${stage.operation}: ${stateLabel}. ${bin}: ${stage.rolls} ${rollsLabel}, ${formatWeightKg(stage.weight)} kg`
  }
  return `${stage.operation}: ${stateLabel}`
}

function TrackDot({ stage }: { stage: WorkOrderStageTrack }) {
  if (stage.state === "skipped") {
    return (
      <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center" title="Skipped">
        <span className="h-3.5 w-3.5 rounded-full border border-dashed border-zinc-400" />
        <span className="absolute h-px w-3 rotate-45 bg-zinc-400" />
      </span>
    )
  }
  const fill =
    stage.state === "completed"
      ? "border-green-500 bg-green-500"
      : stage.state === "in_process"
        ? "border-amber-400 bg-amber-400"
        : "border-zinc-400 bg-transparent dark:border-zinc-300"
  return <span className={`inline-block h-3.5 w-3.5 rounded-full border-2 ${fill}`} />
}

export function WorkOrderTrackCell({ track }: { track?: WorkOrderTrack }) {
  const stages = track?.stages?.length ? track.stages : EMPTY_STAGES
  const title = stages.map(stageTitle).join("\n")

  return (
    <div className="flex shrink-0 items-start pt-2.5" title={title}>
      {stages.map((stage, index) => {
        const showStock = stage.state !== "skipped" && index < stages.length - 1 && stage.rolls > 0
        return (
          <div key={stage.operation} className="flex shrink-0 items-start">
            <div className="flex w-11 flex-col items-center" title={stageTitle(stage)}>
              <TrackDot stage={stage} />
              <span
                className={`mt-0.5 text-[10px] leading-none ${
                  stage.state === "skipped"
                    ? "text-zinc-400"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {SHORT_LABEL[stage.operation] ?? stage.operation}
              </span>
            </div>
            {index < stages.length - 1 ? (
              <div className="relative flex h-3.5 w-12 items-center">
                {showStock ? (
                  <span className="absolute inset-x-0 bottom-1/2 mb-px text-center text-[10px] font-medium leading-none text-gray-800 dark:text-gray-100">
                    {formatWeightKg(stage.weight)}
                  </span>
                ) : null}
                <span className="h-px w-full bg-gray-400 dark:bg-gray-500" />
                {showStock ? (
                  <span className="absolute inset-x-0 top-1/2 mt-px text-center text-[10px] font-medium leading-none text-gray-800 dark:text-gray-100">
                    {stage.rolls}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
