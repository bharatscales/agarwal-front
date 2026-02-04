import { type ColumnDef } from "@tanstack/react-table"
import { MoreVertical, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ColumnHeader } from "@/components/column-header"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type PartyMaster = {
  id: number
  partyCode: string
  partyName: string
  partyType: string
}

type PartyColumnHandlers = {
  onEdit: (party: PartyMaster) => void
  onDelete: (party: PartyMaster) => void
}

export const getPartyMasterColumns = ({
  onEdit,
  onDelete,
}: PartyColumnHandlers): ColumnDef<PartyMaster>[] => [
  {
    accessorKey: "partyCode",
    header: ({ column }) => (
      <ColumnHeader title="PARTY CODE" column={column} placeholder="Filter party code..." />
    ),
    cell: ({ row }) => {
      const partyCode = row.getValue("partyCode") as string
      return <div className="font-medium">{partyCode}</div>
    },
  },
  {
    accessorKey: "partyName",
    header: ({ column }) => (
      <ColumnHeader title="PARTY NAME" column={column} placeholder="Filter party name..." />
    ),
    cell: ({ row }) => {
      const partyName = row.getValue("partyName") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{partyName}</div>
    },
  },
  {
    accessorKey: "partyType",
    header: ({ column }) => (
      <ColumnHeader title="PARTY TYPE" column={column} placeholder="Filter party type..." />
    ),
    cell: ({ row }) => {
      const partyType = row.getValue("partyType") as string
      return <div className="text-sm text-gray-600 dark:text-gray-400">{partyType}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const party = row.original

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
            <DropdownMenuItem onClick={() => onEdit(party)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit party
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(party)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete party
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

