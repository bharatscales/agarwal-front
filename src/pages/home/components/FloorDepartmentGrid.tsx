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
            onClick={() => onSelect(id)}
            className="h-28 sm:h-32 flex flex-col items-center justify-center gap-2 text-base rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <Icon className="h-7 w-7 text-gray-600 dark:text-gray-400" />
            <span className="text-center leading-tight font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
