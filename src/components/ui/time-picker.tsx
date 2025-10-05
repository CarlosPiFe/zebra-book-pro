import * as React from "react";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [inputValue, setInputValue] = React.useState(time || '');
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setInputValue(time || '');
  }, [time]);

  const handleTimeSelect = (hour: string, minute: string) => {
    const newTime = `${hour}:${minute}`;
    onTimeChange(newTime);
    setInputValue(newTime);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d]/g, ''); // Remove non-digits
    
    // Auto-format: if 4 digits entered, format as HH:MM
    if (value.length === 4) {
      const hours = value.substring(0, 2);
      const minutes = value.substring(2, 4);
      const formattedTime = `${hours}:${minutes}`;
      
      // Validate the formatted time
      if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formattedTime)) {
        setInputValue(formattedTime);
        onTimeChange(formattedTime);
        return;
      }
    }
    
    // Allow partial input or already formatted input
    if (value.length <= 4) {
      setInputValue(value);
    } else if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(e.target.value)) {
      setInputValue(e.target.value);
      onTimeChange(e.target.value);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTimeChange('');
    setInputValue('');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={cn("pr-20", !time && "text-muted-foreground")}
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {allowClear && time && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsOpen(!isOpen)}
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
