import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ColumnHeader } from "@/components/column-header"
import { ColumnHeaderSelect } from "@/components/column-header-select"
import { MoreVertical, Edit, Trash2, UserCheck, UserX } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

// Backend User model structure
export interface User {
  id: number
  firstname: string
  lastname: string
  username: string
  role: "superuser" | "admin" | "user"
  department?: "Stock" | "Printing" | "Inspection" | "Slitter" | "ECL" | "Lamination" | "Dispatch" | "Floor"
  theme: "light" | "dark"
  isEnable: boolean
  created_by?: number
  created_at: string
}

type UserColumnHandlers = {
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
  onDelete: (user: User) => void
  canManage: boolean
}

export const getUserColumns = ({
  onEdit,
  onToggleStatus,
  onDelete,
  canManage,
}: UserColumnHandlers): ColumnDef<User>[] => [
  {
    accessorKey: "username",
    header: ({ column }) => (
      <ColumnHeader title="USERNAME" column={column} placeholder="Filter username..." />
    ),
    cell: ({ row }) => {
      const username = row.getValue("username") as string
      return (
        <div className="font-medium">
          {username}
        </div>
      )
    },
  },
  {
    accessorKey: "firstname",
    header: ({ column }) => (
      <ColumnHeader title="FIRST NAME" column={column} placeholder="Filter first name..." />
    ),
    cell: ({ row }) => {
      const firstname = row.getValue("firstname") as string
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {firstname}
        </div>
      )
    },
  },
  {
    accessorKey: "lastname",
    header: ({ column }) => (
      <ColumnHeader title="LAST NAME" column={column} placeholder="Filter last name..." />
    ),
    cell: ({ row }) => {
      const lastname = row.getValue("lastname") as string
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {lastname}
        </div>
      )
    },
  },
  {
    accessorKey: "role",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true
      const rowValue = row.getValue<string>(columnId)
      return filterValue.includes(rowValue)
    },
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      const getRoleVariant = (role: string) => {
        switch (role) {
          case "superuser":
            return "destructive"
          case "admin":
            return "default"
          case "user":
            return "outline"
          default:
            return "outline"
        }
      }
      
      return (
        <Badge variant={getRoleVariant(role) as any} className="capitalize">
          {role}
        </Badge>
      )
    },
    header: ({ column }) => (
      <ColumnHeaderSelect
        title="ROLE"
        column={column}
        options={["user", "admin", "superuser"]}
      />
    ),
  },
  {
    accessorKey: "department",
    header: ({ column }) => (
      <ColumnHeader title="DEPARTMENT" column={column} placeholder="Filter department..." />
    ),
    cell: ({ row }) => {
      const department = row.getValue("department") as string | undefined
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {department || "-"}
        </div>
      )
    },
  },

  {
    accessorKey: "isEnable",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true
      const rowValue = row.getValue<boolean>(columnId) ? "active" : "inactive"
      return filterValue.includes(rowValue)
    },
    cell: ({ row }) => {
      const isEnable = row.getValue("isEnable") as boolean
      return (
        <div className="flex items-center space-x-2">
          {isEnable ? (
            <UserCheck className="h-4 w-4 text-green-600" />
          ) : (
            <UserX className="h-4 w-4 text-red-600" />
          )}
          <Badge variant={isEnable ? "default" : "destructive"}>
            {isEnable ? "Active" : "Inactive"}
          </Badge>
        </div>
      )
    },
    header: ({ column }) => (
      <ColumnHeaderSelect
        title="STATUS"
        column={column}
        options={["active", "inactive"]}
      />
    ),
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <ColumnHeader title="CREATED" column={column} placeholder="Filter created date..." />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {date.toLocaleDateString()}
        </div>
      )
    },
  },
  {
    id: "actions",
    
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id.toString())}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit user
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem
                className={user.isEnable ? "text-yellow-600" : "text-green-600"}
                onClick={() => onToggleStatus(user)}
              >
                {user.isEnable ? (
                  <UserX className="mr-2 h-4 w-4" />
                ) : (
                  <UserCheck className="mr-2 h-4 w-4" />
                )}
                {user.isEnable ? "Deactivate" : "Activate"} user
              </DropdownMenuItem>
            )}
            {canManage && (
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(user)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete user
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
