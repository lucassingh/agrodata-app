"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  onCreateNew?: (label: string) => Promise<ComboboxOption>;
  placeholder?: string;
  disabled?: boolean;
}

/** "Autocomplete freeSolo + crear nueva opción" del legacy (usado en
 *  Potreros/Tareas para cultivos, categorías de animales, etc.), armado con
 *  Popover+Command de shadcn ya que no hay un Autocomplete nativo. */
export function Combobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = "Seleccionar…",
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;
  const exactMatch = options.some(
    (o) => o.label.toLowerCase() === search.trim().toLowerCase(),
  );

  const handleCreate = async () => {
    if (!onCreateNew || !search.trim() || creating) return;
    setCreating(true);
    try {
      const created = await onCreateNew(search.trim());
      onChange(created.label);
      setOpen(false);
      setSearch("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          />
        }
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Buscar o crear..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {onCreateNew && search.trim() ? (
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void handleCreate()}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  <Plus size={14} />
                  {creating ? "Creando..." : `Crear "${search.trim()}"`}
                </button>
              ) : (
                "Sin resultados."
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {onCreateNew && search.trim() && !exactMatch && options.length > 0 ? (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => void handleCreate()}
                  disabled={creating}
                >
                  <Plus size={14} />
                  {creating ? "Creando..." : `Crear "${search.trim()}"`}
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
