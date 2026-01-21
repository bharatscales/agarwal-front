import { Check, ChevronsUpDown } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption {
  value: string | number
  label: string
  disabled?: boolean
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string | number | null
  onValueChange: (value: string | number | null) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  noOptionLabel?: string
  showNoOption?: boolean
}

export function Combobox({ 
  options, 
  value, 
  onValueChange, 
  placeholder = "Select option...", 
  disabled = false,
  loading = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  noOptionLabel = "No Option",
  showNoOption = true
}: ComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find(option => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left"
          disabled={disabled || loading}
        >
          <span className="truncate flex-1 text-left">
            {loading ? (
              "Loading..."
            ) : value && selectedOption ? (
              selectedOption.label
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            {showNoOption && (
              <CommandItem
                onSelect={() => {
                  onValueChange(null)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    !value ? "opacity-100" : "opacity-0"
                  )}
                />
                {noOptionLabel}
              </CommandItem>
            )}
            {options.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
                disabled={option.disabled}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}