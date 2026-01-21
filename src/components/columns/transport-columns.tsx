import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { MoreVertical, Edit, Trash2, Copy, MapPin } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"

export type Transport = {
  id: number
  name: string
  address: string | null
  city: string | null
  sapcode: string | null
  created_by: number | null
  created_at: string
}

export const createTransportColumns = (
  onEdit: (transport: Transport) => void,
  onDelete: (transport: Transport) => void
): ColumnDef<Transport>[] => [
  {
    accessorKey: "sapcode",
    header: "SAP Code",
    cell: ({ row }) => {
      const sapcode = row.getValue("sapcode") as string
      if (!sapcode) {
        return (
          <span className="text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm">
            No SAP Code
          </span>
        )
      }
      return (
        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm">{sapcode}</span>
        </div>
      )
    },
  },
  {
    accessorKey: "name",
    header: "Transport Name",
    cell: ({ row }) => {
      const name = row.getValue("name") as string
      return (
        <div className="font-medium">
          {name}
        </div>
      )
    },
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const address = row.getValue("address") as string
      if (!address) {
        return (
          <span className="text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm">
            No Address
          </span>
        )
      }
      return (
        <div className="flex items-center space-x-2">
          <MapPin className="h-4 w-4 text-gray-400" />
          <span className="max-w-xs truncate" title={address}>
            {address}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => {
      const city = row.getValue("city") as string
      if (!city) {
        return (
          <span className="text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm">
            No City
          </span>
        )
      }
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {city}
        </div>
      )
    },
  },
  {
    accessorKey: "created_at",
    header: "Created Date",
    cell: ({ row }) => {
      const created_at = row.getValue("created_at") as string
      return (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(created_at).toLocaleDateString()}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const transport = row.original
      const { user } = useAuth()

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
            {transport.sapcode && (
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(transport.sapcode!)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy SAP Code
              </DropdownMenuItem>
            )}
            {user?.role === "admin" || user?.role === "superuser" ? (
              <DropdownMenuItem onClick={() => onEdit(transport)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Transport
              </DropdownMenuItem>
            ) : null}
            {user?.role === "admin" || user?.role === "superuser" ? (
              <DropdownMenuItem 
                onClick={() => onDelete(transport)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Transport
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// Keep the old export for backward compatibility
export const transportColumns = createTransportColumns(
  () => {},
  () => {}
)
