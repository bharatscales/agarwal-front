import { ArrowUpDown, FilterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ColumnHeaderSelectProps {
  title: string;
  column: any;
  options: string[];
}

export function ColumnHeaderSelect({ title, column, options }: ColumnHeaderSelectProps) {
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
            <div className="grid grid-cols-2 gap-2 p-2">
              {options.map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={e => e.preventDefault()}
                  onClick={e => {
                    e.preventDefault();
                    const current = column.getFilterValue() as string[] | undefined;
                    const next = current?.includes(option)
                      ? current.filter((s) => s !== option)
                      : [...(current || []), option];
                    column.setFilterValue(next.length ? next : undefined);
                  }}
                  className="p-0"
                >
                  <Badge
                    variant={((column.getFilterValue() as string[] | undefined)?.includes(option)) ? "default" : "outline"}
                    className="w-full justify-center"
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                onClick={() => column.setFilterValue(undefined)}
                className="p-0 col-span-2"
              >
                <Badge variant="destructive" className="w-full justify-center">Clear</Badge>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
