import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";

import {
  type ColumnDef,
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
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
}

const LOAD_MORE_THRESHOLD_PX = 120;

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  getRowId,
  bulkActions,
  scrollable = false,
  scrollHeight = "80vh",
  onLoadMore,
  isLoadingMore = false,
  hasMore = false,
}: DataTableProps<TData, TValue>) {
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
            <table className="w-full caption-bottom text-sm border-collapse">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className="border-b border-zinc-600"
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="sticky top-0 z-20 bg-white dark:bg-zinc-900 text-sm font-bold border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 shadow-[0_2px_4px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {rows?.length ? (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={`border-b border-zinc-600 ${onRowClick ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest("button") ||
                          target.closest("[role='menuitem']") ||
                          target.closest("[data-radix-popper-content-wrapper]")
                        ) {
                          return;
                        }
                        onRowClick?.(row.original);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className="p-1 pl-2 border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black text-sm"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-b border-zinc-600">
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 text-sm"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
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
          <Table className="border-collapse">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b border-zinc-600"
                >
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="text-sm font-bold border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows?.length ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`border-b border-zinc-600 ${onRowClick ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (
                        target.closest("button") ||
                        target.closest("[role='menuitem']") ||
                        target.closest("[data-radix-popper-content-wrapper]")
                      ) {
                        return;
                      }
                      onRowClick?.(row.original);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="p-1 pl-2 border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black text-sm"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-b border-zinc-600">
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 text-sm"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="flex items-center justify-between py-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {table.getFilteredSelectedRowModel().rows.length > 0 && bulkActions?.(table.getFilteredSelectedRowModel().rows.map((r) => r.original))}
          <span className="text-muted-foreground dark:text-muted-foreground text-black text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </span>
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
