import { type ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash2, MapPin, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"

export type Party = {
  id: number
  name: string
  sapcode: string
  addresses: PartyAddress[]
}

export type PartyAddress = {
  id: number
  row_id: number
  name: string
  address: string
  party_sapcode: string
}

export const partyColumns: ColumnDef<Party>[] = [
  {
    accessorKey: "sapcode",
    header: "SAP Code",
    cell: ({ row }) => {
      const sapcode = row.getValue("sapcode") as string
      return (
        <div className="font-mono text-sm">
          {sapcode}
        </div>
      )
    },
  },
  {
    accessorKey: "name",
    header: "Party Name",
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
    accessorKey: "addresses",
    header: "Addresses",
    cell: ({ row }) => {
      const addresses = row.getValue("addresses") as PartyAddress[]
      if (!addresses || addresses.length === 0) {
        return (
          <span className="text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm">
            No Addresses
          </span>
        )
      }
      
      return (
        <AddressesCell addresses={addresses} />
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const party = row.original
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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(party.sapcode)}>
              Copy SAP Code
            </DropdownMenuItem>
            {(user?.role === "admin" || user?.role === "superuser") && (
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Party
              </DropdownMenuItem>
            )}
            {(user?.role === "admin" || user?.role === "superuser") && (
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Party
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

// Separate component for the addresses cell with expand/collapse functionality
function AddressesCell({ addresses }: { addresses: PartyAddress[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  if (addresses.length === 0) {
    return (
      <span className="text-zinc-300 dark:text-zinc-500 px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-sm">
        No Addresses
      </span>
    )
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="space-y-2">
      {/* Always show first 2 addresses */}
      {addresses.slice(0, 2).map((address) => (
        <div key={address.id} className="flex items-center space-x-2 text-sm">
          <MapPin className="h-3 w-3 text-gray-400" />
          <span className="max-w-xs truncate" title={address.address}>
            {address.name}: {address.address}
          </span>
        </div>
      ))}
      
      {/* Show expand/collapse button if there are more than 2 addresses */}
      {addresses.length > 2 && (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpanded}
            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {isExpanded ? (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3 mr-1" />
                Show {addresses.length - 2} More
              </>
              )}
          </Button>
        </div>
      )}
      
      {/* Show additional addresses when expanded */}
      {isExpanded && addresses.length > 2 && (
        <div className="space-y-1 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
          {addresses.slice(2).map((address) => (
            <div key={address.id} className="flex items-center space-x-2 text-sm">
              <MapPin className="h-3 w-3 text-gray-400" />
              <span className="max-w-xs truncate" title={address.address}>
                {address.name}: {address.address}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
