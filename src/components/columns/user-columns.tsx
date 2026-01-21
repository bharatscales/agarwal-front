import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash2, UserCheck, UserX } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"

// Backend User model structure
export interface User {
  id: number
  firstname: string
  lastname: string
  username: string
  role: "superuser" | "admin" | "user"
  theme: "light" | "dark"
  isEnable: boolean
  created_by?: number
  created_at: string
}

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Username",
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
    header: "First Name",
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
    header: "Last Name",
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
    header: "Role",
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
  },

  {
    accessorKey: "isEnable",
    header: "Status",
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
  },
  {
    accessorKey: "created_at",
    header: "Created",
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
      const { user: currentUser } = useAuth()

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
            <DropdownMenuItem>
              <Edit className="mr-2 h-4 w-4" />
              Edit user
            </DropdownMenuItem>
            {(currentUser?.role === "admin" || currentUser?.role === "superuser") && (
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                {user.isEnable ? "Deactivate" : "Activate"} user
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
