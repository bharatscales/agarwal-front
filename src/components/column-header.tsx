
import { ArrowUpDown, FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnHeaderProps {
  title: string;
  column: any;
  placeholder?: string;
}

export function ColumnHeader({ title, column, placeholder }: ColumnHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
             <span className="text-black dark:text-zinc-300 text-sm font-bold">{title}</span>
             <div className="flex flex-col gap-1 -mr-2">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center h-3 w-3 p-1 dark:text-zinc-600 text-zinc-300 focus:outline-none focus:ring-0 focus-visible:ring-0"
        >
          <ArrowUpDown className="h-1 w-1" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`h-3 w-3 p-1 focus:outline-none focus:ring-0 focus-visible:ring-0 ${
                column.getFilterValue() ? 'text-black dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
              }`}
            >
              <span className="sr-only">Open menu</span>
              <FilterIcon className="h-1 w-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-[10px]">
              <FilterIcon className="mr-2 h-4 w-4" />
            </DropdownMenuLabel>
            <div className="p-2">
              <input
                placeholder={placeholder || `Filter ${title.toLowerCase()}...`}
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className="w-full p-1 text-xs border rounded"
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
