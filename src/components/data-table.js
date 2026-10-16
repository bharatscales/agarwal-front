import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { useState, useRef, useCallback } from "react";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
const LOAD_MORE_THRESHOLD_PX = 120;
function normalizeMergeKey(raw) {
    return raw != null && String(raw) !== "" ? String(raw) : null;
}
function clusterRowsByGroupKey(rows, getKey) {
    const groups = new Map();
    const order = [];
    rows.forEach((row, index) => {
        const key = normalizeMergeKey(getKey(row.original)) ?? `u:${index}:${row.id}`;
        const groupedKey = key.startsWith("u:") ? key : `g:${key}`;
        if (!groups.has(groupedKey)) {
            groups.set(groupedKey, []);
            order.push(groupedKey);
        }
        groups.get(groupedKey).push(row);
    });
    return order.flatMap((key) => groups.get(key) ?? []).map((row, index) => ({
        ...row,
        index,
    }));
}
function clusterRowsByGroupPath(rows, getPath) {
    const nest = (items, depth) => {
        if (items.length <= 1)
            return items;
        const maxDepth = Math.max(0, ...items.map((row) => getPath(row.original).length));
        if (depth >= maxDepth)
            return items;
        const groups = new Map();
        const order = [];
        items.forEach((row, index) => {
            const raw = getPath(row.original)[depth];
            const key = normalizeMergeKey(raw) ?? `u:${index}:${row.id}`;
            const groupedKey = key.startsWith("u:") ? key : `g:${key}`;
            if (!groups.has(groupedKey)) {
                groups.set(groupedKey, []);
                order.push(groupedKey);
            }
            groups.get(groupedKey).push(row);
        });
        return order.flatMap((key) => nest(groups.get(key) ?? [], depth + 1));
    };
    return nest(rows, 0).map((row, index) => ({
        ...row,
        index,
    }));
}
function buildMergeSpanMap(rows, mergeColumns) {
    const map = new Map();
    if (mergeColumns.length === 0)
        return map;
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
export function DataTable({ columns, data, onRowClick, getRowId, bulkActions, singleRowSelection = false, scrollable = false, scrollHeight = "80vh", onLoadMore, isLoadingMore = false, hasMore = false, compact = false, size = "sm", showSelectionSummary = true, getRowSpanGroupKey, getRowGroupPath, }) {
    const textSize = size === "xs" ? "text-xs" : "text-sm";
    const [sorting, setSorting] = useState([]);
    const [columnFilters, setColumnFilters] = useState([]);
    const [rowSelection, setRowSelection] = useState({});
    const [columnVisibility, setColumnVisibility] = useState({});
    const scrollContainerRef = useRef(null);
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
        if (!scrollable || !onLoadMore || isLoadingMore || !hasMore)
            return;
        const el = scrollContainerRef.current;
        if (!el)
            return;
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
        .filter((column) => Boolean(column.getKey));
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
        : new Map();
    const renderHeaderCell = (header) => {
        if (header.colSpan === 0 || header.isPlaceholder)
            return null;
        const hasRealSubHeaders = header.subHeaders.some((sub) => !sub.isPlaceholder);
        const rowSpan = hasRealSubHeaders ? 1 : headerRowCount - header.depth;
        return (_jsx(TableHead, { colSpan: header.colSpan, rowSpan: rowSpan > 1 ? rowSpan : undefined, className: `bg-sidebar ${textSize} font-bold border-r border-b border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 align-middle ${compact ? "h-auto min-h-0 py-0" : ""} ${hasRealSubHeaders ? "text-center" : ""}`, children: flexRender(header.column.columnDef.header, header.getContext()) }, header.id));
    };
    const handleBodyRowClick = (e, row) => {
        const target = e.target;
        if (target.closest("button") ||
            target.closest("a") ||
            target.closest("input") ||
            target.closest("[role='checkbox']") ||
            target.closest("[role='menuitem']") ||
            target.closest("[data-radix-popper-content-wrapper]")) {
            return;
        }
        if (hasSelectColumn && row.getCanSelect()) {
            row.toggleSelected();
        }
        onRowClick?.(row.original);
    };
    const renderBodyCells = (row) => row.getVisibleCells().map((cell) => {
        const span = mergeSpans.get(`${row.id}:${cell.column.id}`);
        if (span?.skip)
            return null;
        return (_jsx(TableCell, { rowSpan: span?.rowSpan, className: `${compact ? "py-0 px-2" : "p-1 pl-2"} border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black ${textSize} ${span?.rowSpan ? "align-middle" : ""}`, children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id));
    });
    const renderBodyRows = () => {
        if (!displayRows?.length) {
            return (_jsx(TableRow, { className: "border-b border-zinc-600", children: _jsx(TableCell, { colSpan: leafColumnCount, className: `h-24 text-center border-r border-zinc-600 text-zinc-300 dark:text-zinc-300 text-black pl-2 ${textSize}`, children: "No results." }) }));
        }
        return displayRows.map((row) => (_jsx(TableRow, { "data-state": row.getIsSelected() && "selected", className: `border-b border-zinc-600 ${rowIsClickable ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800" : ""}`, onClick: (e) => handleBodyRowClick(e, row), children: renderBodyCells(row) }, row.id)));
    };
    return (_jsxs("div", { children: [_jsx("div", { className: "overflow-hidden rounded-sm border border-r border-zinc-600", children: scrollable ? (_jsxs("div", { ref: scrollContainerRef, onScroll: handleScroll, className: "overflow-auto", style: { maxHeight: scrollHeight }, children: [_jsxs("table", { className: `w-full caption-bottom border-collapse ${textSize}`, children: [_jsx(TableHeader, { className: "sticky top-0 z-20 bg-sidebar [&_tr]:border-b-0", children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { children: headerGroup.headers.map((header) => renderHeaderCell(header)) }, headerGroup.id))) }), _jsx(TableBody, { children: renderBodyRows() })] }), scrollable && hasMore && isLoadingMore && (_jsx("div", { className: "flex items-center justify-center py-3 border-t border-zinc-600 bg-zinc-50 dark:bg-zinc-900/50", children: _jsx("span", { className: "text-sm text-zinc-500 dark:text-zinc-400", children: "Loading more..." }) }))] })) : (_jsxs(Table, { className: `border-collapse ${textSize}`, children: [_jsx(TableHeader, { className: "[&_tr]:border-b-0", children: table.getHeaderGroups().map((headerGroup) => (_jsx(TableRow, { children: headerGroup.headers.map((header) => renderHeaderCell(header)) }, headerGroup.id))) }), _jsx(TableBody, { children: renderBodyRows() })] })) }), _jsxs("div", { className: "flex items-center justify-between py-1 gap-2 flex-wrap", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [table.getFilteredSelectedRowModel().rows.length > 0 && bulkActions?.(table.getFilteredSelectedRowModel().rows.map((r) => r.original)), showSelectionSummary && (_jsxs("span", { className: "text-muted-foreground dark:text-muted-foreground text-black text-sm", children: [table.getFilteredSelectedRowModel().rows.length, " of", " ", table.getFilteredRowModel().rows.length, " row(s) selected."] }))] }), showPagination && (_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: () => table.previousPage(), disabled: !table.getCanPreviousPage(), children: "Previous" }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => table.nextPage(), disabled: !table.getCanNextPage(), children: "Next" })] }))] })] }));
}
