import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, Check, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover"

export interface CreatableOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface CreatableComboboxProps {
  options: CreatableOption[]
  value?: string | null
  onValueChange: (value: string | null) => void
  onCreateOption?: (label: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  searchPlaceholder?: string
  emptyMessage?: string
  createLabel?: string
  footerText?: string
  tickable?: boolean
  triggerRef?: React.Ref<HTMLInputElement>
  onInputKeyDown?: React.KeyboardEventHandler<HTMLInputElement>
}

export function CreatableCombobox({
  options,
  value,
  onValueChange,
  onCreateOption,
  placeholder = "Select option...",
  disabled = false,
  loading = false,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found.",
  createLabel = "Create new",
  footerText,
  tickable = false,
  triggerRef,
  onInputKeyDown,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)

  const selectedOption = options.find(option => option.value === value)
  const trimmedSearch = searchValue.trim()
  const canCreate =
    !!onCreateOption &&
    trimmedSearch.length > 0 &&
    !options.some(
      option => option.label.toLowerCase() === trimmedSearch.toLowerCase()
    )

  const createText = useMemo(() => {
    if (!trimmedSearch) return createLabel
    return `${createLabel} "${trimmedSearch}"`
  }, [createLabel, trimmedSearch])

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(trimmedSearch.toLowerCase())
  )

  const displayValue = open
    ? searchValue
    : selectedOption
      ? selectedOption.label
      : ""

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
  }, [open])

  const setInputRef = (node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof triggerRef === "function") {
      triggerRef(node)
    } else if (triggerRef && "current" in triggerRef) {
      triggerRef.current = node
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setSearchValue("")
        }
      }}
    >
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={setInputRef}
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            placeholder={
              loading ? "Loading..." : open ? searchPlaceholder : placeholder
            }
            value={displayValue}
            onChange={(event) => {
              setSearchValue(event.target.value)
              if (!open) {
                setOpen(true)
              }
            }}
            onFocus={() => {
              setOpen(true)
              setSearchValue(selectedOption?.label ?? "")
            }}
            onClick={() => {
              setOpen(true)
            }}
            onKeyDown={onInputKeyDown}
            className="pr-9"
          />
          <ArrowRight className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
        }}
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null
          if (target && inputRef.current?.contains(target)) {
            event.preventDefault()
          }
        }}
      >
        <Command>
          {/* Search input is the trigger field; no input inside list */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      if (tickable && value === option.value) {
                        onValueChange(null)
                        return
                      }
                      onValueChange(option.value)
                      if (!tickable) {
                        setOpen(false)
                      }
                    }}
                    disabled={option.disabled}
                    className={tickable ? "data-[selected=true]:bg-transparent" : undefined}
                  >
                    {tickable && (
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                    )}
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onCreateOption?.(trimmedSearch)
                    onValueChange(trimmedSearch)
                    setSearchValue("")
                    setOpen(false)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createText}
                </CommandItem>
              </CommandGroup>
            )}
            {footerText && (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {footerText}
              </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

