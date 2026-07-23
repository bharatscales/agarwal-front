import { type FilterFn } from "@tanstack/react-table"

/** Substring match for text-box column filters. TanStack defaults numeric columns to inNumberRange. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- shared across typed ColumnDef row shapes
export const includesStringFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const val = row.getValue(columnId)
  return String(val ?? "").toLowerCase().includes(String(filterValue ?? "").toLowerCase())
}
