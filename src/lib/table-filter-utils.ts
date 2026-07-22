import { type FilterFn } from "@tanstack/react-table"

/** Substring match for text-box column filters. TanStack defaults numeric columns to inNumberRange. */
export const includesStringFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  const val = row.getValue(columnId)
  return String(val ?? "").toLowerCase().includes(String(filterValue ?? "").toLowerCase())
}
