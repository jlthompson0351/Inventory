import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  captionLayout?: "buttons" | "dropdown" | "dropdown-buttons";
  className?: string;
}

export function DatePicker({
  selected,
  onSelect,
  disabled,
  placeholder = "Select date",
  fromYear,
  toYear,
  captionLayout,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          disabled={disabled}
          initialFocus
          fromYear={fromYear}
          toYear={toYear}
          captionLayout={captionLayout}
        />
      </PopoverContent>
    </Popover>
  );
} 