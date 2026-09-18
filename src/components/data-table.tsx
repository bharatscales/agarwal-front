import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback, type MouseEvent, type ReactNode } from "react";

import {
  type ColumnDef,
  type Header,
  type Row,
  type RowData,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Merge this column across consecutive rows that share the merge key. */
    mergeRows?: boolean
    /** Per-column merge key. Falls back to table `getRowSpanGroupKey` when omitted. */
    getMergeKey?: (row: TData) => string | number | null | undefined
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  /** When true, only one row can be selected at a time. */
  singleRowSelection?: boolean;
  /** When true, table body is scrollable and pagination is hidden. */
  scrollable?: boolean;
  /** Height of the scrollable area (e.g. "60vh" or "500px"). Used when scrollable is true. */
  scrollHeight?: string;
  /** Called when user scrolls near bottom (for lazy loading). */
  onLoadMore?: () => void;
  /** Whether more data is being fetched. */
  isLoadingMore?: boolean;
  /** Whether there is more data to load. */
  hasMore?: boolean;
  /** Compact spacing for denser row height. */
  compact?: boolean;
  /** Table font size. Use "xs" for denser grids like Order Book. */
  size?: "sm" | "xs";
  /** Show selected-row summary text in footer. */
  showSelectionSummary?: boolean;
  /** Group sibling rows together and rowspan columns marked `meta.mergeRows`. */
  getRowSpanGroupKey?: (row: TData) => string | number | null | undefined;
  /** Hierarchical grouping path, e.g. [fatherId, motherId], so each input can span independently. */
  getRowGroupPath?: (row: TData) => Array<string | number | null | undefined>;
}

const LOAD_MORE_THRESHOLD_PX = 120;

function normalizeMergeKey(raw: string | number | null | undefined): string | null {
  return raw != null && String(raw) !== "" ? String(raw) : null;
}

function clusterRowsByGroupKey<TData>(
  rows: Row<TData>[],
  getKey: (row: TData) => string | number | null | undefined
): Row<TData>[] {
  const groups = new Map<string, Row<TData>[]>();
  const order: string[] = [];
  rows.forEach((row, index) => {
    const key = normalizeMergeKey(getKey(row.original)) ?? `u:${index}:${row.id}`;
    const groupedKey = key.startsWith("u:") ? key : `g:${key}`;
    if (!groups.has(groupedKey)) {
      groups.set(groupedKey, []);
      order.push(groupedKey);
    }
    groups.get(groupedKey)!.push(row);
  });
  return order.flatMap((key) => groups.get(key) ?? []).map((row, index) => ({
    ...row,
    index,
  }));
}

function clusterRowsByGroupPath<TData>(
  rows: Row<TData>[],
  getPath: (row: TData) => Array<string | number | null | undefined>
): Row<TData>[] {
  const nest = (items: Row<TData>[], depth: number): Row<TData>[] => {
    if (items.length <= 1) return items;
    const maxDepth = Math.max(0, ...items.map((row) => getPath(row.original).length));
    if (depth >= maxDepth) return items;

    const groups = new Map<string, Row<TData>[]>();
    const order: string[] = [];
    items.forEach((row, index) => {
      const raw = getPath(row.original)[depth];
      const key = normalizeMergeKey(raw) ?? `u:${index}:${row.id}`;
      const groupedKey = key.startsWith("u:") ? key : `g:${key}`;
      if (!groups.has(groupedKey)) {
        groups.set(groupedKey, []);
        order.push(groupedKey);
      }
      groups.get(groupedKey)!.push(row);
    });
    return order.flatMap((key) => nest(groups.get(key) ?? [], depth + 1));
  };

  return nest(rows, 0).map((row, index) => ({
    ...row,
    index,
  }));
}

function buildMergeSpanMap<TData>(
  rows: Row<TData>[],
  mergeColumns: Array<{
    id: string
    getKey: (row: TData) => string | number | null | undefined
  }>
): Map<string, { rowSpan?: number; skip?: boolean }> {
  const map = new Map<string, { rowSpan?: number; skip?: boolean }>();
  if (mergeColumns.length === 0) return map;

  for (const column of mergeColumns) {
    const keys = rows.map((row) => normalizeMergeKey(column.getKey(row.original)));
    let i = 0;
    while (i < rows.length) {
      const key = keys[i];
      if (!key) {
        i += 1;
        continue;
      }
      let span = 1;
      while (i + span < rows.length && keys[i + span] === key) {
        span += 1;
      }
      if (span > 1) {
        map.set(`${rows[i].id}:${column.id}`, { rowSpan: span });
        for (let offset = 1; offset < span; offset += 1) {
          map.set(`${rows[i + offset].id}:${column.id}`, { skip: true });
        }
      }
      i += span;
    }
  }
  return map;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  getRowId,
  bulkActions,
  singleRowSelection = false,
  scrollable = false,
  scrollHeight = "80vh",
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
  compact = false,
  size = "sm",
  showSelectionSummary = true,
  getRowSpanGroupKey,
  getRowGroupPath,
}: DataTableProps<TData, TValue>) {
  const textSize = size === "xs" ? "text-xs" : "text-sm";
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    enableMultiRowSelection: !singleRowSelection,
    ...(scrollable
      ? {}
      : { getPaginationRowModel: getPaginationRowModel() }),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    initialState: {
      ...(scrollable ? {} : { pagination: { pageSize: 20 } }),
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const handleScroll = useCallback(() => {
    if (!scrollable || !onLoadMore || isLoadingMore || !hasMore) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight: sh } = el;
    if (scrollTop + clientHeight >= sh - LOAD_MORE_THRESHOLD_PX) {
      onLoadMore();
    }
  }, [scrollable, onLoadMore, isLoadingMore, hasMore]);

  const rows = table.getRowModel().rows;
  const showPagination = !scrollable;
  const hasSelectColumn = columns.some((col) => col.id === "select");
  const rowIsClickable = Boolean(onRowClick) || hasSelectColumn;
  const leafColumnCount = table.getVisibleLeafColumns().length;

  const headerRowCount = table.getHeaderGroups().length;
  const mergeColumns = table
    .getVisibleLeafColumns()
    .filter((column) => column.columnDef.meta?.mergeRows)
    .map((column) => ({
      id: column.id,
      getKey: column.columnDef.meta?.getMergeKey ?? getRowSpanGroupKey,
    }))
    .filter((column): column is { id: string; getKey: (row: TData) => string | number | null | undefined } =>
      Boolean(column.getKey)
    );
  const canMergeRows = mergeColumns.length > 0 && Boolean(getRowGroupPath || getRowSpanGroupKey);

  const groupedRows = canMergeRows
    ? getRowGroupPath
      ? clusterRowsByGroupPath(rows, getRowGroupPath)
      : getRowSpanGroupKey
        ? clusterRowsByGroupKey(rows, getRowSpanGroupKey)
        : rows
    : rows;
  const displayRows = groupedRows;
  const mergeSpans = canMergeRows
    ? buildMergeSpanMap(groupedRows, mergeColumns)
    : new Map<string, { rowSpan?: number; skip?: boolean }>();

  const renderHeaderCell = (header: Header<TData, unknown>) => {
    if (header.colSpan === 0 || header.isPlaceholder) return null;
    const hasRealSubHeaders = header.subHeaders.some((sub) => !sub.isPlaceholder);
    const rowSpan = hasRealSubHeaders ? 1 : headerRowCount - header.depth;
    return (
      <TableHead
        key={header.id}
        colSpan={header.colSpan}
        rowSpan={rowSpan > 1 ? rowSpan : undefined}
        className={`bg-sidebar ${textSize} font-bold border-r border-b border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 align-middle ${compact ? "py-1" : ""} ${hasRealSubHeaders ? "text-center" : ""}`}
      >
        {flexRender(header.column.columnDef.header, header.getContext())}
      </TableHead>
    );
  };

  const handleBodyRowClick = (e: MouseEvent, row: Row<TData>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[role='checkbox']") ||
      target.closest("[role='menuitem']") ||
      target.closest("[data-radix-popper-content-wrapper]")
    ) {
      return;
    }
    if (hasSelectColumn && row.getCanSelect()) {
      row.toggleSelected();
    }
    onRowClick?.(row.original);
  };

  const renderBodyCells = (row: Row<TData>): ReactNode =>
    row.getVisibleCells().map((cell) => {
      const span = mergeSpans.get(`${row.id}:${cell.column.id}`);
      if (span?.skip) return null;
      return (
        <TableCell
          key={cell.id}
          rowSpan={span?.rowSpan}
          className={`${compact ? "py-0.5 px-2" : "p-1 pl-2"} border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black ${textSize} ${span?.rowSpan ? "align-middle" : ""}`}
        >
          {flexRender(
            cell.column.columnDef.cell,
            cell.getContext()
          )}
        </TableCell>
      );
    });

  const renderBodyRows = (): ReactNode => {
    if (!displayRows?.length) {
      return (
        <TableRow className="border-b border-zinc-600">
          <TableCell
            colSpan={leafColumnCount}
            className={`h-24 text-center border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 ${textSize}`}
          >
            No results.
          </TableCell>
        </TableRow>
      );
    }
    return displayRows.map((row) => (
      <TableRow
        key={row.id}
        data-state={row.getIsSelected() && "selected"}
        className={`border-b border-zinc-600 ${rowIsClickable ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`}
        onClick={(e) => handleBodyRowClick(e, row)}
      >
        {renderBodyCells(row)}
      </TableRow>
    ));
  };

  return (
    <div>
      <div className="overflow-hidden rounded-sm border border-r border-zinc-600">
        {scrollable ? (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-auto"
            style={{ maxHeight: scrollHeight }}
          >
            <table className={`w-full caption-bottom border-collapse ${textSize}`}>
              <TableHeader className="sticky top-0 z-20 bg-sidebar [&_tr]:border-b-0">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => renderHeaderCell(header))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {renderBodyRows()}
              </TableBody>
            </table>
            {scrollable && hasMore && isLoadingMore && (
              <div className="flex items-center justify-center py-3 border-t border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Loading more...
                </span>
              </div>
            )}
          </div>
        ) : (
          <Table className={`border-collapse ${textSize}`}>
            <TableHeader className="[&_tr]:border-b-0">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => renderHeaderCell(header))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {renderBodyRows()}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex items-center justify-between py-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {table.getFilteredSelectedRowModel().rows.length > 0 && bulkActions?.(table.getFilteredSelectedRowModel().rows.map((r) => r.original))}
          {showSelectionSummary && (
            <span className="text-muted-foreground dark:text-muted-foreground text-black text-sm">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </span>
          )}
        </div>
        {showPagination && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
