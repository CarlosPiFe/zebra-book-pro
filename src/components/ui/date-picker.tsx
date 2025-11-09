import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
}

export function DatePicker({ date, onDateChange, placeholder = "Seleccionar fecha", disabled, onPreviousDay, onNextDay }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal px-1.5 gap-0 h-10 w-auto",
            !date && "text-muted-foreground"
          )}
        >
          {onPreviousDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreviousDay();
              }}
              className="flex items-center justify-center hover:bg-accent rounded-sm transition-colors p-0.5"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}
          <span className="text-sm px-1 truncate">
            {date ? format(date, "d 'de' MMMM", { locale: es }) : <span>{placeholder}</span>}
          </span>
          {onNextDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNextDay();
              }}
              className="flex items-center justify-center hover:bg-accent rounded-sm transition-colors p-0.5"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background z-[9999]" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          disabled={disabled}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
