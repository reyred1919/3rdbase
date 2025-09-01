
'use client';

import React, { useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Member } from '@/types/okr';

export type MultiSelectOption = Pick<Member, 'id' | 'name'>;


interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: MultiSelectOption[];
  onChange: (selected: MultiSelectOption[]) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select options...",
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  
  const handleSelect = (option: MultiSelectOption) => {
    const isSelected = selected.some(s => s.id === option.id);
    if (isSelected) {
      onChange(selected.filter(s => s.id !== option.id));
    } else {
      onChange([...selected, option]);
    }
  };
  
  const handleRemove = (optionId: number | string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s.id !== optionId));
  };
  
  const selectedIds = new Set(selected.map(s => s.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
              selected.map(item => (
                <Badge
                  variant="secondary"
                  key={item.id}
                  className="mr-1 mb-1"
                  onClick={(e) => handleRemove(item.id, e)}
                >
                  {item.name}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="جستجوی عضو..." />
          <CommandList>
            <CommandEmpty>عضوی یافت نشد.</CommandEmpty>
            <CommandGroup>
              {options.map(option => (
                <CommandItem
                  key={option.id}
                  onSelect={() => handleSelect(option)}
                  value={option.name}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedIds.has(option.id) ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
