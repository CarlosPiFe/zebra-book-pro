import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimeSelectorProps {
  value: string;
  onChange: (time: string) => void;
  availableSlots: string[];
  placeholder?: string;
  disabled?: boolean;
  showManualInput?: boolean;
  label?: string;
}

export function TimeSelector({
  value,
  onChange,
  availableSlots,
  placeholder = "Seleccionar hora",
  disabled = false,
  showManualInput = true,
  label,
}: TimeSelectorProps) {
  const [isManualMode, setIsManualMode] = useState(false);
  const [open, setOpen] = useState(false);

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSlotSelect = (slot: string) => {
    onChange(slot);
    setOpen(false);
    setIsManualMode(false);
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-between text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              {isManualMode ? (
                <Input
                  type="time"
                  value={value}
                  onChange={handleManualInput}
                  className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{value || placeholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <ScrollArea className="h-60">
              <div className="p-2">
                {availableSlots.length > 0 ? (
                  availableSlots.map((slot) => (
                    <Button
                      key={slot}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start font-normal",
                        value === slot && "bg-accent"
                      )}
                      onClick={() => handleSlotSelect(slot)}
                    >
                      {slot}
                    </Button>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No hay horarios disponibles
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
        
        {showManualInput && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsManualMode(!isManualMode);
              setOpen(false);
            }}
          >
            <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </Button>
        )}
      </div>
    </div>
  );
}
