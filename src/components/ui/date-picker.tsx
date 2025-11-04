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
            "w-full justify-between text-left font-normal group",
            !date && "text-muted-foreground"
          )}
        >
          {onPreviousDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreviousDay();
              }}
              className="h-full flex items-center justify-center hover:bg-accent rounded-sm transition-colors px-1.5"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}
          <span className="flex-1 text-center">
            {date ? format(date, "PPP", { locale: es }) : <span>{placeholder}</span>}
          </span>
          {onNextDay && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNextDay();
              }}
              className="h-full flex items-center justify-center hover:bg-accent rounded-sm transition-colors px-1.5"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
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
