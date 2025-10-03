import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  time?: string;
  onTimeChange: (time: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}

export function TimePicker({ time, onTimeChange, placeholder = "Seleccionar hora", allowClear = false }: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const [selectedHour, selectedMinute] = time ? time.split(':') : ['', ''];

  const handleTimeSelect = (hour: string, minute: string) => {
    onTimeChange(`${hour}:${minute}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTimeChange('');
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground"
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          <span className="flex-1">{time || placeholder}</span>
          {allowClear && time && (
            <X 
              className="h-4 w-4 ml-2 hover:text-destructive" 
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
        <div className="flex">
          <ScrollArea className="h-[200px] w-[70px] border-r">
            <div className="p-2 space-y-1">
              {hours.map((hour) => (
                <Button
                  key={hour}
                  variant={selectedHour === hour ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-center text-sm",
                    selectedHour === hour && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleTimeSelect(hour, selectedMinute || '00')}
                >
                  {hour}
                </Button>
              ))}
            </div>
          </ScrollArea>
          <ScrollArea className="h-[200px] w-[70px]">
            <div className="p-2 space-y-1">
              {minutes.map((minute) => (
                <Button
                  key={minute}
                  variant={selectedMinute === minute ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-center text-sm",
                    selectedMinute === minute && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleTimeSelect(selectedHour || '00', minute)}
                >
                  {minute}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
