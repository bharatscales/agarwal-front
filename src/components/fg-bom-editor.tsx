import { useEffect, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreatableCombobox, type CreatableOption } from "@/components/ui/creatable-combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getItems, type BomLine, type Item } from "@/lib/item-api"
import { filmGsm } from "@/lib/film-calc"
import { isGsmBomItemGroup, isRmFilmGroup, isRmItemGroup } from "@/lib/rm-item-groups"

function gsmForFilmLine(
  density: number | string | null | undefined,
  micron: string | number | null | undefined,
): string {
  const computed = filmGsm(density, micron)
  return computed != null ? String(computed) : ""
}

export type BomEditorLine = {
  id: number
  layerNo: number
  rmItemId: string
  rmItemGroup: string
  size: string
  micron: string
  gsm: string
}

export const createBomEditorLine = (id: number, layerNo: number): BomEditorLine => ({
  id,
  layerNo,
  rmItemId: "",
  rmItemGroup: "",
  size: "",
  micron: "",
  gsm: "",
})

function parsePositive(value: string): number | null {
  const n = Number(value.trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

type FgBomEditorEditProps = {
  mode?: "edit"
  value: BomEditorLine[]
  onChange: (lines: BomEditorLine[]) => void
  readonlyLines?: never
}

type FgBomEditorReadonlyProps = {
  mode: "readonly"
  readonlyLines: BomLine[]
  value?: never
  onChange?: never
}

export type FgBomEditorProps = FgBomEditorEditProps | FgBomEditorReadonlyProps

export function FgBomEditor(props: FgBomEditorProps) {
  const isEdit = props.mode !== "readonly"
  const nextRowId = useRef(100)
  const [rmItemOptions, setRmItemOptions] = useState<CreatableOption[]>([])
  const [rmItemsById, setRmItemsById] = useState<Record<string, Item>>({})
  const [rmItemsLoading, setRmItemsLoading] = useState(false)

  const editLines = isEdit ? props.value : []
  const readonlyLines = !isEdit ? props.readonlyLines : []

  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    setRmItemsLoading(true)
    getItems(0, 500)
      .then((items) => {
        if (cancelled) return
        const rm = items.filter((i) => isRmItemGroup(i.itemGroup))
        const byId: Record<string, Item> = {}
        for (const it of rm) byId[String(it.id)] = it
        setRmItemsById(byId)
        setRmItemOptions(
          rm.map((it) => ({
            value: String(it.id),
            label: `${it.itemCode} — ${it.itemName || it.itemCode}`,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) {
          setRmItemOptions([])
          setRmItemsById({})
        }
      })
      .finally(() => {
        if (!cancelled) setRmItemsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isEdit])

  const updateLine = (rowId: number, patch: Partial<BomEditorLine>) => {
    if (!isEdit) return
    props.onChange(
      editLines.map((row) => {
        if (row.id !== rowId) return row
        const next = { ...row, ...patch }
        if (patch.rmItemId !== undefined && patch.rmItemId !== row.rmItemId) {
          const group = rmItemsById[patch.rmItemId]?.itemGroup ?? ""
          next.rmItemGroup = group
          next.size = ""
          next.micron = ""
          next.gsm = ""
        }
        const group = next.rmItemGroup || rmItemsById[next.rmItemId]?.itemGroup || ""
        if (isRmFilmGroup(group)) {
          next.gsm = gsmForFilmLine(rmItemsById[next.rmItemId]?.density, next.micron)
        }
        return next
      }),
    )
  }

  const addRow = () => {
    if (!isEdit) return
    const id = nextRowId.current++
    const layerNo = editLines.length + 1
    props.onChange([...editLines, createBomEditorLine(id, layerNo)])
  }

  const removeRow = (rowId: number) => {
    if (!isEdit || editLines.length <= 1) return
    props.onChange(editLines.filter((r) => r.id !== rowId).map((r, i) => ({ ...r, layerNo: i + 1 })))
  }

  if (!isEdit && readonlyLines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No structure defined for this stage.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="bg-muted/40 text-xs font-semibold w-14 rounded-tl-md border-b">
              Layer
            </TableHead>
            <TableHead className="bg-muted/40 text-xs font-semibold min-w-[9rem] border-b">
              Structure (RM item)
            </TableHead>
            <TableHead className="bg-muted/40 text-xs font-semibold w-[6.5rem] border-b">
              Size
            </TableHead>
            <TableHead className="bg-muted/40 text-xs font-semibold w-[6.5rem] border-b">
              Micron
            </TableHead>
            <TableHead className="bg-muted/40 text-xs font-semibold w-[6.5rem] border-b">
              GSM
            </TableHead>
            {isEdit ? (
              <TableHead className="bg-muted/40 w-10 border-b rounded-tr-md p-0" />
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isEdit
            ? editLines.map((row) => {
                const group = row.rmItemGroup || rmItemsById[row.rmItemId]?.itemGroup || ""
                const film = isRmFilmGroup(group)
                const gsm = isGsmBomItemGroup(group)
                const filmGsmValue = film
                  ? gsmForFilmLine(rmItemsById[row.rmItemId]?.density, row.micron) || row.gsm
                  : row.gsm
                return (
                  <TableRow key={row.id} className="hover:bg-transparent">
                    <TableCell className="py-2 align-middle">
                      <div className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-muted/30 px-2 text-sm font-medium tabular-nums">
                        {row.layerNo}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 align-middle min-w-[9rem]">
                      <CreatableCombobox
                        options={rmItemOptions}
                        value={row.rmItemId || null}
                        onValueChange={(selected) => updateLine(row.id, { rmItemId: selected ?? "" })}
                        placeholder="Select RM item"
                        searchPlaceholder="Search RM item…"
                        emptyMessage="No RM items found."
                        loading={rmItemsLoading}
                      />
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="h-9 tabular-nums"
                        placeholder={film ? "Size *" : "—"}
                        value={row.size}
                        disabled={!film}
                        onChange={(e) => updateLine(row.id, { size: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="h-9 tabular-nums"
                        placeholder={film ? "Micron *" : "—"}
                        value={row.micron}
                        disabled={!film}
                        onChange={(e) => updateLine(row.id, { micron: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="py-2 align-middle">
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className={`h-9 tabular-nums${film ? " bg-muted/30" : ""}`}
                        placeholder={gsm ? "GSM *" : film ? "auto" : "—"}
                        value={film ? filmGsmValue : row.gsm}
                        disabled={!gsm && !film}
                        readOnly={film}
                        title={
                          film
                            ? "GSM = density × micron from the selected RM film"
                            : undefined
                        }
                        onChange={(e) => updateLine(row.id, { gsm: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="w-10 p-2 align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={editLines.length <= 1}
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            : readonlyLines.map((line) => (
                <TableRow key={line.id} className="hover:bg-transparent">
                  <TableCell className="py-2 align-middle">
                    <div className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-md border border-input bg-muted/30 px-2 text-sm font-medium tabular-nums">
                      {line.layerNo}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 align-middle text-sm">
                    {line.rmItemCode
                      ? `${line.rmItemCode}${line.rmItemName ? ` — ${line.rmItemName}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="py-2 align-middle text-sm tabular-nums">
                    {isRmFilmGroup(line.rmItemGroup) && line.size != null ? line.size : "—"}
                  </TableCell>
                  <TableCell className="py-2 align-middle text-sm tabular-nums">
                    {isRmFilmGroup(line.rmItemGroup) && line.micron != null ? line.micron : "—"}
                  </TableCell>
                  <TableCell className="py-2 align-middle text-sm tabular-nums">
                    {isGsmBomItemGroup(line.rmItemGroup) && line.gsm != null
                      ? line.gsm
                      : isRmFilmGroup(line.rmItemGroup)
                        ? filmGsm(line.rmDensity, line.micron) ?? line.gsm ?? "—"
                        : "—"}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
      {isEdit ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
            <Plus className="h-4 w-4" />
            Add layer
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function bomLinesToEditorLines(lines: BomLine[]): BomEditorLine[] {
  return lines
    .filter((l) => l.rmItemId != null)
    .map((l, i) => ({
      id: l.id ?? i + 1,
      layerNo: l.layerNo ?? i + 1,
      rmItemId: String(l.rmItemId),
      rmItemGroup: l.rmItemGroup ?? "",
      size: l.size != null ? String(l.size) : "",
      micron: l.micron != null ? String(l.micron) : "",
      gsm: isRmFilmGroup(l.rmItemGroup)
        ? gsmForFilmLine(l.rmDensity, l.micron) || (l.gsm != null ? String(l.gsm) : "")
        : l.gsm != null
          ? String(l.gsm)
          : "",
    }))
}

export function validateBomEditorLines(lines: BomEditorLine[], stageLabel: string): string | null {
  for (const row of lines) {
    if (!row.rmItemId.trim()) continue
    const group = row.rmItemGroup
    if (isRmFilmGroup(group)) {
      if (parsePositive(row.size) == null || parsePositive(row.micron) == null) {
        return `${stageLabel} layer ${row.layerNo}: size and micron are required for RM film.`
      }
    } else if (isGsmBomItemGroup(group)) {
      if (parsePositive(row.gsm) == null) {
        return `${stageLabel} layer ${row.layerNo}: GSM is required for ink, adhesive, or chemical.`
      }
    }
  }
  return null
}
