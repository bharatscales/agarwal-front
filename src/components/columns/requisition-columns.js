import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";
export const requisitionColumns = [
    {
        id: "select",
        header: ({ table }) => (_jsx("div", { className: "flex items-center", children: _jsx(Checkbox, { checked: table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate"), onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value), "aria-label": "Select all", className: "" }) })),
        cell: ({ row }) => (_jsx("div", { className: "flex items-center justify-center w-full pr-2", children: _jsx(Checkbox, { checked: row.getIsSelected(), onCheckedChange: (value) => row.toggleSelected(!!value), "aria-label": "Select row" }) })),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: "date_field",
        header: ({ column }) => _jsx(ColumnHeader, { title: "DATE", column: column, placeholder: "Filter date..." }),
        cell: ({ row }) => {
            const date = row.getValue("date_field");
            return _jsx("span", { children: new Date(date).toLocaleDateString() });
        },
    },
    {
        accessorKey: "po_num",
        header: ({ column }) => _jsx(ColumnHeader, { title: "P.O. NO.", column: column, placeholder: "Filter P.O. No..." }),
    },
    {
        accessorKey: "party_name",
        header: ({ column }) => _jsx(ColumnHeader, { title: "PARTY", column: column, placeholder: "Filter party..." }),
        cell: ({ row }) => {
            const partyName = row.getValue("party_name");
            return _jsx("span", { children: partyName || 'No Party' });
        },
    },
    {
        accessorKey: "drop_location",
        header: ({ column }) => _jsx(ColumnHeader, { title: "LOCATION", column: column, placeholder: "Filter location..." }),
    },
    {
        accessorKey: "quantity",
        header: ({ column }) => _jsx(ColumnHeader, { title: "QUANTITY (TON)", column: column, placeholder: "Filter quantity..." }),
        cell: ({ row }) => {
            const quantity = row.getValue("quantity");
            return _jsxs("span", { children: [quantity, " TON"] });
        },
    },
    {
        accessorKey: "party_address_text",
        header: ({ column }) => _jsx(ColumnHeader, { title: "SHIPPING ADDRESS", column: column, placeholder: "Filter shipping..." }),
        cell: ({ row }) => {
            const addressText = row.getValue("party_address_text");
            return _jsx("span", { children: addressText || 'No Address' });
        },
    },
    {
        accessorKey: "priority",
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const rowValue = row.getValue(columnId);
            return filterValue.includes(rowValue);
        },
        cell: ({ row }) => {
            const priority = row.getValue("priority");
            return (_jsx("span", { className: `px-2 py-0 rounded-full text-xs font-medium ${priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    priority === 'high' ? 'bg-red-50 text-red-700' :
                        priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}`, children: priority }));
        },
        header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "PRIORITY", column: column, options: ["low", "medium", "high", "urgent"] })),
    },
    {
        accessorKey: "status",
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const rowValue = row.getValue(columnId);
            return filterValue.includes(rowValue);
        },
        cell: ({ row }) => {
            const status = row.getValue("status");
            return (_jsx("span", { className: `px-2 py-0 rounded-full text-xs font-medium ${status === 'new' ? 'bg-blue-100 text-blue-800' :
                    status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'}`, children: status }));
        },
        header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "STATUS", column: column, options: ["new", "pending", "done"] })),
    },
    {
        accessorKey: "loading_point",
        header: ({ column }) => _jsx(ColumnHeader, { title: "LOADING POINT", column: column, placeholder: "Filter loading point..." }),
    },
    {
        accessorKey: "truck_type",
        header: ({ column }) => _jsx(ColumnHeader, { title: "TRUCK TYPE", column: column, placeholder: "Filter truck type..." }),
    },
    {
        accessorKey: "transport_assignments",
        header: ({ column }) => _jsx(ColumnHeader, { title: "TRANSPORT ASSIGNMENTS", column: column, placeholder: "Filter transport..." }),
        cell: ({ row }) => {
            const assignments = row.getValue("transport_assignments");
            if (!assignments || assignments.length === 0) {
                return _jsx("span", { className: "text-gray-500 text-sm", children: "No assignments" });
            }
            return (_jsx("div", { className: "min-w-[300px]", children: _jsxs("table", { className: "w-full text-xs border-collapse border border-gray-200 dark:border-gray-700", children: [_jsx("thead", { children: _jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800", children: [_jsx("th", { className: "text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700", children: "Vehicle" }), _jsx("th", { className: "text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700", children: "Type" }), _jsx("th", { className: "text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700", children: "Transport" }), _jsx("th", { className: "text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300", children: "Capacity (TON)" })] }) }), _jsx("tbody", { children: assignments.map((assignment) => (_jsxs("tr", { className: "border-b border-gray-200 dark:border-gray-700 last:border-b-0", children: [_jsx("td", { className: "py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700", children: assignment.vehicle }), _jsx("td", { className: "py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700", children: assignment.truck_type }), _jsx("td", { className: "py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700", children: assignment.transport_name || 'No Transport' }), _jsxs("td", { className: "py-1 px-2 text-gray-900 dark:text-gray-100", children: [assignment.capacity, " TON"] })] }, assignment.id))) })] }) }));
        },
    },
    {
        accessorFn: (row) => {
            const assignments = row.transport_assignments;
            if (!assignments || assignments.length === 0)
                return '';
            return assignments.map(a => a.vehicle).join(', ');
        },
        id: "vehicle",
        header: ({ column }) => _jsx(ColumnHeader, { title: "VEHICLE", column: column, placeholder: "Filter vehicle..." }),
        cell: ({ row }) => {
            const assignments = row.getValue("transport_assignments");
            if (!assignments || assignments.length === 0) {
                return _jsx("span", { className: "text-gray-500 text-sm", children: "-" });
            }
            return (_jsx("div", { className: "text-xs", children: assignments.map((assignment, index) => (_jsx("div", { className: index > 0 ? "mt-1 pt-1 border-t border-gray-100" : "", children: assignment.vehicle }, assignment.id))) }));
        },
    },
    {
        accessorFn: (row) => {
            const assignments = row.transport_assignments;
            if (!assignments || assignments.length === 0)
                return '';
            return assignments.map(a => a.truck_type).join(', ');
        },
        id: "assignment_truck_type",
        header: ({ column }) => _jsx(ColumnHeader, { title: "ASSIGNMENT TYPE", column: column, placeholder: "Filter assignment type..." }),
        cell: ({ row }) => {
            const assignments = row.getValue("transport_assignments");
            if (!assignments || assignments.length === 0) {
                return _jsx("span", { className: "text-gray-500 text-sm", children: "-" });
            }
            return (_jsx("div", { className: "text-xs", children: assignments.map((assignment, index) => (_jsx("div", { className: index > 0 ? "mt-1 pt-1 border-t border-gray-100" : "", children: assignment.truck_type }, assignment.id))) }));
        },
    },
    {
        accessorFn: (row) => {
            const assignments = row.transport_assignments;
            if (!assignments || assignments.length === 0)
                return '';
            return assignments.map(a => a.capacity).join(', ');
        },
        id: "capacity",
        header: ({ column }) => _jsx(ColumnHeader, { title: "CAPACITY (TON)", column: column, placeholder: "Filter capacity..." }),
        cell: ({ row }) => {
            const assignments = row.getValue("transport_assignments");
            if (!assignments || assignments.length === 0) {
                return _jsx("span", { className: "text-gray-500 text-sm", children: "-" });
            }
            return (_jsx("div", { className: "text-xs", children: assignments.map((assignment, index) => (_jsxs("div", { className: index > 0 ? "mt-1 pt-1 border-t border-gray-100" : "", children: [assignment.capacity, " TON"] }, assignment.id))) }));
        },
    },
    {
        accessorFn: (row) => {
            const assignments = row.transport_assignments;
            if (!assignments || assignments.length === 0)
                return '';
            return assignments.map(a => a.transport_name || 'No Transport').join(', ');
        },
        id: "transport_id",
        header: ({ column }) => _jsx(ColumnHeader, { title: "TRANSPORT", column: column, placeholder: "Filter transport..." }),
        cell: ({ row }) => {
            const assignments = row.getValue("transport_assignments");
            if (!assignments || assignments.length === 0) {
                return _jsx("span", { className: "text-gray-500 text-sm", children: "-" });
            }
            return (_jsx("div", { className: "text-xs", children: assignments.map((assignment, index) => (_jsx("div", { className: index > 0 ? "mt-1 pt-1 border-t border-gray-100" : "", children: assignment.transport_name || 'No Transport' }, assignment.id))) }));
        },
    },
];
