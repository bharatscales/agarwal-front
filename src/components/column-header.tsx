
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
  /** Split the title onto two lines (last word on line 2) so numeric columns can be narrower. */
  wrap?: boolean;
  /** Smaller sort/filter icons, used by dense tables like Order Book. */
  compact?: boolean;
}

function twoLineTitle(title: string) {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return title;
  const last = parts.pop()!;
  return `${parts.join(" ")}\n${last}`;
}

export function ColumnHeader({ title, column, placeholder, wrap, compact }: ColumnHeaderProps) {
  const label = wrap ? twoLineTitle(title) : title;
  const iconClass = compact ? "size-2.5" : "size-3.5";
  const btnClass = compact
    ? "h-3.5 w-3.5 min-h-0 min-w-0 p-0 [&_svg]:size-2.5"
    : "h-4 w-4 min-h-0 min-w-0 p-0 [&_svg]:size-3.5";
  return (
    <div className={`flex justify-between gap-1 ${wrap ? "items-start w-min" : "items-center w-full"}`}>
             <span
               data-wrap-header={wrap ? "" : undefined}
               className={`text-black dark:text-zinc-300 font-bold ${wrap ? "whitespace-pre-line leading-tight" : ""}`}
             >
               {label}
             </span>
             <div className={`flex flex-col -mr-2 ${compact ? "gap-0" : "gap-0.5"}`}>
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className={`flex items-center ${btnClass} text-zinc-300 dark:text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-transparent dark:hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0`}
        >
          <ArrowUpDown className={iconClass} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className={`${btnClass} hover:bg-transparent dark:hover:bg-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 ${
                column.getFilterValue() ? 'text-black dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'
              } hover:text-zinc-900 dark:hover:text-zinc-100`}
            >
              <span className="sr-only">Open menu</span>
              <FilterIcon className={iconClass} />
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
