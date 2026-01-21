import { type ColumnDef } from "@tanstack/react-table";
import { MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Checkbox } from "@/components/ui/checkbox";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";

export type Payment = {
  id: string;
  date?: string;
  pono?: string;
  party: string;
  location: string;
  quantity: number;
  shipping: string;
  priority?: string;
  status: "pending" | "processing" | "success" | "failed";
  loadingPoint?: string;
  truckNo?: string;
  transport: string;
};

export const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className=""
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center w-full pr-2">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <ColumnHeader title="DATE" column={column} placeholder="Filter date..." />,
  },
  {
    accessorKey: "pono",
    header: ({ column }) => <ColumnHeader title="P.O. NO." column={column} placeholder="Filter P.O. No..." />,
  },
  {
    accessorKey: "party",
    header: ({ column }) => <ColumnHeader title="PARTY" column={column} placeholder="Filter party..." />,
  },
  {
    accessorKey: "location",
    header: ({ column }) => <ColumnHeader title="LOCATION" column={column} placeholder="Filter location..." />,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => <ColumnHeader title="QUANTITY" column={column} placeholder="Filter quantity..." />,
  },
  {
    accessorKey: "shipping",
    header: ({ column }) => <ColumnHeader title="SHIPPING ADDRESS" column={column} placeholder="Filter shipping..." />,
  },
  {
    accessorKey: "priority",
    header: ({ column }) => <ColumnHeader title="PRIORITY" column={column} placeholder="Filter priority..." />,
  },
    {
    accessorKey: "status",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      const rowValue = row.getValue<string>(columnId);
      return filterValue.includes(rowValue);
    },
    cell: ({ row }) => {
      const value = row.getValue("status") as string;
      return <span>{value}</span>;
    },
    header: ({ column }) => (
      <ColumnHeaderSelect 
        title="STATUS" 
        column={column} 
        options={["pending", "processing", "success", "failed"]} 
      />
    ),
  },
  {
    accessorKey: "loadingPoint",
    header: ({ column }) => <ColumnHeader title="LOADING POINT" column={column} placeholder="Filter loading point..." />,
  },
  {
    accessorKey: "truckNo",
    header: ({ column }) => <ColumnHeader title="TRUCK NO" column={column} placeholder="Filter truck no..." />,
  },
  {
    accessorKey: "transport",
    header: ({ column }) => <ColumnHeader title="TRANSPORT" column={column} placeholder="Filter transport..." />,
  },

   {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original;

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
              onClick={() => navigator.clipboard.writeText(payment.id)}
            >
              Copy payment ID
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
