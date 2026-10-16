import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import {} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";
import { MoreVertical, Edit, Trash2, UserCheck, UserX, Key, VenetianMask } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
export const getUserColumns = ({ onEdit, onToggleStatus, onDelete, onCreateApiKey, canManage, isSuperuser = false, }) => [
    {
        accessorKey: "username",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "USERNAME", column: column, placeholder: "Filter username..." })),
        cell: ({ row }) => {
            const username = row.getValue("username");
            return (_jsx("div", { className: "font-medium", children: username }));
        },
    },
    {
        accessorKey: "firstname",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "FIRST NAME", column: column, placeholder: "Filter first name..." })),
        cell: ({ row }) => {
            const firstname = row.getValue("firstname");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: firstname }));
        },
    },
    {
        accessorKey: "lastname",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "LAST NAME", column: column, placeholder: "Filter last name..." })),
        cell: ({ row }) => {
            const lastname = row.getValue("lastname");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: lastname }));
        },
    },
    {
        accessorKey: "role",
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const rowValue = row.getValue(columnId);
            return filterValue.includes(rowValue);
        },
        cell: ({ row }) => {
            const role = row.getValue("role");
            const getRoleVariant = (role) => {
                switch (role) {
                    case "superuser":
                        return "destructive";
                    case "admin":
                        return "default";
                    case "user":
                        return "outline";
                    default:
                        return "outline";
                }
            };
            return (_jsx(Badge, { variant: getRoleVariant(role), className: "capitalize", children: role }));
        },
        header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "ROLE", column: column, options: ["user", "admin", "superuser"] })),
    },
    {
        accessorKey: "department",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "DEPARTMENT", column: column, placeholder: "Filter department..." })),
        cell: ({ row }) => {
            const department = row.getValue("department");
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: department || "-" }));
        },
    },
    {
        accessorKey: "isEnable",
        filterFn: (row, columnId, filterValue) => {
            if (!Array.isArray(filterValue) || filterValue.length === 0)
                return true;
            const rowValue = row.getValue(columnId) ? "active" : "inactive";
            return filterValue.includes(rowValue);
        },
        cell: ({ row }) => {
            const isEnable = row.getValue("isEnable");
            return (_jsxs("div", { className: "flex items-center space-x-2", children: [isEnable ? (_jsx(UserCheck, { className: "h-4 w-4 text-green-600" })) : (_jsx(UserX, { className: "h-4 w-4 text-red-600" })), _jsx(Badge, { variant: isEnable ? "default" : "destructive", children: isEnable ? "Active" : "Inactive" })] }));
        },
        header: ({ column }) => (_jsx(ColumnHeaderSelect, { title: "STATUS", column: column, options: ["active", "inactive"] })),
    },
    {
        accessorKey: "created_at",
        header: ({ column }) => (_jsx(ColumnHeader, { title: "CREATED", column: column, placeholder: "Filter created date..." })),
        cell: ({ row }) => {
            const date = new Date(row.getValue("created_at"));
            return (_jsx("div", { className: "text-sm text-gray-600 dark:text-gray-400", children: date.toLocaleDateString() }));
        },
    },
    {
        id: "actions",
        cell: ({ row }) => {
            const user = row.original;
            const { user: currentUser, impersonate } = useAuth();
            const navigate = useNavigate();
            const canImpersonate = currentUser?.role === "superuser";
            const showImpersonate = canImpersonate &&
                user.isEnable &&
                user.role !== "superuser" &&
                user.id.toString() !== currentUser?.id;
            const handleImpersonate = async () => {
                try {
                    const impersonatedUser = await impersonate(user.id);
                    if (!impersonatedUser)
                        return;
                    const dept = impersonatedUser.department?.toLowerCase();
                    if (dept === "inspection") {
                        navigate("/manufacturing/work-order");
                    }
                    else {
                        navigate("/home");
                    }
                }
                catch {
                    // Error already logged in AuthContext
                }
            };
            return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0", children: [_jsx("span", { className: "sr-only", children: "Open menu" }), _jsx(MoreVertical, { className: "h-4 w-4" })] }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuLabel, { children: "Actions" }), _jsx(DropdownMenuItem, { onClick: () => navigator.clipboard.writeText(user.id.toString()), children: "Copy user ID" }), _jsxs(DropdownMenuItem, { onClick: () => onEdit(user), children: [_jsx(Edit, { className: "mr-2 h-4 w-4" }), "Edit user"] }), showImpersonate && (_jsxs(DropdownMenuItem, { onClick: handleImpersonate, children: [_jsx(VenetianMask, { className: "mr-2 h-4 w-4" }), "Impersonate"] })), canManage && (_jsxs(DropdownMenuItem, { className: user.isEnable ? "text-yellow-600" : "text-green-600", onClick: () => onToggleStatus(user), children: [user.isEnable ? (_jsx(UserX, { className: "mr-2 h-4 w-4" })) : (_jsx(UserCheck, { className: "mr-2 h-4 w-4" })), user.isEnable ? "Deactivate" : "Activate", " user"] })), canManage && (_jsxs(DropdownMenuItem, { className: "text-red-600", onClick: () => onDelete(user), children: [_jsx(Trash2, { className: "mr-2 h-4 w-4" }), "Delete user"] })), isSuperuser && onCreateApiKey && (_jsxs(DropdownMenuItem, { className: "text-blue-600", onClick: () => onCreateApiKey(user), children: [_jsx(Key, { className: "mr-2 h-4 w-4" }), "Create API Key"] }))] })] }));
        },
    },
];
