import { floorDepartmentBlocks, type FloorDepartmentId } from "../constants"

type FloorDepartmentGridProps = {
  onSelect: (id: FloorDepartmentId) => void
}

export function FloorDepartmentGrid({ onSelect }: FloorDepartmentGridProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300">
        Departments
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 max-w-4xl">
        {floorDepartmentBlocks.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            data-floor-theme={id}
            onClick={() => onSelect(id)}
            className="relative h-28 sm:h-32 flex flex-col items-center justify-center gap-2 text-base rounded-lg overflow-hidden border-2 border-primary/35 bg-secondary/80 hover:bg-secondary hover:border-primary/70 transition-colors cursor-pointer"
          >
            <span className="absolute inset-x-0 top-0 h-1.5 bg-primary" aria-hidden />
            <Icon className="h-7 w-7 text-primary" />
            <span className="text-center leading-tight font-semibold text-secondary-foreground">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
