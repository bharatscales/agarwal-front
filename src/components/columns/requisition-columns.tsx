import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnHeader } from "@/components/column-header";
import { ColumnHeaderSelect } from "@/components/column-header-select";

export type Requisition = {
  id: number;
  date_field: string;
  po_num: string;
  party_id: number | null;
  party_address_id: number | null;
  drop_location: string;
  quantity: number;
  status: string;
  priority: string;
  loading_point: number;
  truck_type: string;
  created_by: number | null;
  created_at: string;
  party_name: string | null;
  party_address_text: string | null;
  transport_assignments?: Array<{
    id: number;
    vehicle: string;
    truck_type: string;
    capacity: number;
    transport_id: number;
    transport_name: string | null;
  }>;
};

export const requisitionColumns: ColumnDef<Requisition>[] = [
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
    accessorKey: "date_field",
    header: ({ column }) => <ColumnHeader title="DATE" column={column} placeholder="Filter date..." />,
    cell: ({ row }) => {
      const date = row.getValue("date_field") as string;
      return <span>{new Date(date).toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "po_num",
    header: ({ column }) => <ColumnHeader title="P.O. NO." column={column} placeholder="Filter P.O. No..." />,
  },
  {
    accessorKey: "party_name",
    header: ({ column }) => <ColumnHeader title="PARTY" column={column} placeholder="Filter party..." />,
    cell: ({ row }) => {
      const partyName = row.getValue("party_name") as string | null;
      return <span>{partyName || 'No Party'}</span>;
    },
  },
  {
    accessorKey: "drop_location",
    header: ({ column }) => <ColumnHeader title="LOCATION" column={column} placeholder="Filter location..." />,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => <ColumnHeader title="QUANTITY (TON)" column={column} placeholder="Filter quantity..." />,
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      return <span>{quantity} TON</span>;
    },
  },
  {
    accessorKey: "party_address_text",
    header: ({ column }) => <ColumnHeader title="SHIPPING ADDRESS" column={column} placeholder="Filter shipping..." />,
    cell: ({ row }) => {
      const addressText = row.getValue("party_address_text") as string | null;
      return <span>{addressText || 'No Address'}</span>;
    },
  },
  {
    accessorKey: "priority",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      const rowValue = row.getValue<string>(columnId);
      return filterValue.includes(rowValue);
    },
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string;
      return (
        <span className={`px-2 py-0 rounded-full text-xs font-medium ${
          priority === 'urgent' ? 'bg-red-100 text-red-800' :
          priority === 'high' ? 'bg-red-50 text-red-700' :
          priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {priority}
        </span>
      );
    },
    header: ({ column }) => (
      <ColumnHeaderSelect 
        title="PRIORITY" 
        column={column} 
        options={["low", "medium", "high", "urgent"]} 
      />
    ),
  },
  {
    accessorKey: "status",
    filterFn: (row, columnId, filterValue: string[]) => {
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      const rowValue = row.getValue<string>(columnId);
      return filterValue.includes(rowValue);
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <span className={`px-2 py-0 rounded-full text-xs font-medium ${
          status === 'new' ? 'bg-blue-100 text-blue-800' :
          status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {status}
        </span>
      );
    },
    header: ({ column }) => (
      <ColumnHeaderSelect 
        title="STATUS" 
        column={column} 
        options={["new", "pending", "done"]} 
      />
    ),
  },
  {
    accessorKey: "loading_point",
    header: ({ column }) => <ColumnHeader title="LOADING POINT" column={column} placeholder="Filter loading point..." />,
  },
  {
    accessorKey: "truck_type",
    header: ({ column }) => <ColumnHeader title="TRUCK TYPE" column={column} placeholder="Filter truck type..." />,
  },
  {
    accessorKey: "transport_assignments",
    
    header: ({ column }) => <ColumnHeader title="TRANSPORT ASSIGNMENTS" column={column} placeholder="Filter transport..." />,
    cell: ({ row }) => {
      const assignments = row.getValue("transport_assignments") as Array<{
        id: number;
        vehicle: string;
        truck_type: string;
        capacity: number;
        transport_id: number;
        transport_name: string | null;
      }> | undefined;
      
      if (!assignments || assignments.length === 0) {
        return <span className="text-gray-500 text-sm">No assignments</span>;
      }
      
      return (
        <div className="min-w-[300px]">
          <table className="w-full text-xs border-collapse border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <th className="text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Vehicle</th>
                <th className="text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Type</th>
                <th className="text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">Transport</th>
                <th className="text-left py-1 px-2 font-medium text-gray-700 dark:text-gray-300">Capacity (TON)</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <td className="py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{assignment.vehicle}</td>
                  <td className="py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{assignment.truck_type}</td>
                  <td className="py-1 px-2 text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700">{assignment.transport_name || 'No Transport'}</td>
                  <td className="py-1 px-2 text-gray-900 dark:text-gray-100">{assignment.capacity} TON</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    },
  },
  {
    accessorFn: (row) => {
      const assignments = row.transport_assignments;
      if (!assignments || assignments.length === 0) return '';
      return assignments.map(a => a.vehicle).join(', ');
    },
    id: "vehicle",
    header: ({ column }) => <ColumnHeader title="VEHICLE" column={column} placeholder="Filter vehicle..." />,
    cell: ({ row }) => {
      const assignments = row.getValue("transport_assignments") as Array<{
        id: number;
        vehicle: string;
        truck_type: string;
        capacity: number;
        transport_id: number;
        transport_name: string | null;
      }> | undefined;
      
      if (!assignments || assignments.length === 0) {
        return <span className="text-gray-500 text-sm">-</span>;
      }
      
      return (
        <div className="text-xs">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className={index > 0 ? "mt-1 pt-1 border-t border-gray-100" : ""}>
              {assignment.vehicle}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => {
      const assignments = row.transport_assignments;
      if (!assignments || assignments.length === 0) return '';
      return assignments.map(a => a.truck_type).join(', ');
    },
    id: "assignment_truck_type",
    header: ({ column }) => <ColumnHeader title="ASSIGNMENT TYPE" column={column} placeholder="Filter assignment type..." />,
    cell: ({ row }) => {
      const assignments = row.getValue("transport_assignments") as Array<{
        id: number;
        vehicle: string;
        truck_type: string;
        capacity: number;
        transport_id: number;
        transport_name: string | null;
      }> | undefined;
      
      if (!assignments || assignments.length === 0) {
        return <span className="text-gray-500 text-sm">-</span>;
      }
      
      return (
        <div className="text-xs">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className={index > 0 ? "mt-1 pt-1 border-t border-gray-100" : ""}>
              {assignment.truck_type}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => {
      const assignments = row.transport_assignments;
      if (!assignments || assignments.length === 0) return '';
      return assignments.map(a => a.capacity).join(', ');
    },
    id: "capacity",
    header: ({ column }) => <ColumnHeader title="CAPACITY (TON)" column={column} placeholder="Filter capacity..." />,
    cell: ({ row }) => {
      const assignments = row.getValue("transport_assignments") as Array<{
        id: number;
        vehicle: string;
        truck_type: string;
        capacity: number;
        transport_id: number;
        transport_name: string | null;
      }> | undefined;
      
      if (!assignments || assignments.length === 0) {
        return <span className="text-gray-500 text-sm">-</span>;
      }
      
      return (
        <div className="text-xs">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className={index > 0 ? "mt-1 pt-1 border-t border-gray-100" : ""}>
              {assignment.capacity} TON
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorFn: (row) => {
      const assignments = row.transport_assignments;
      if (!assignments || assignments.length === 0) return '';
      return assignments.map(a => a.transport_name || 'No Transport').join(', ');
    },
    id: "transport_id",
    header: ({ column }) => <ColumnHeader title="TRANSPORT" column={column} placeholder="Filter transport..." />,
    cell: ({ row }) => {
      const assignments = row.getValue("transport_assignments") as Array<{
        id: number;
        vehicle: string;
        truck_type: string;
        capacity: number;
        transport_id: number;
        transport_name: string | null;
      }> | undefined;
      
      if (!assignments || assignments.length === 0) {
        return <span className="text-gray-500 text-sm">-</span>;
      }
      
      return (
        <div className="text-xs">
          {assignments.map((assignment, index) => (
            <div key={assignment.id} className={index > 0 ? "mt-1 pt-1 border-t border-gray-100" : ""}>
              {assignment.transport_name || 'No Transport'}
            </div>
          ))}
        </div>
      );
    },
  },

];
