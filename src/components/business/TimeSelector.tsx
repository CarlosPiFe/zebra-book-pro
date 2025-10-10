import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimeSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  availableSlots?: string[];
  placeholder?: string;
  disabled?: boolean;
  allowManualInput?: boolean;
}

export function TimeSelector({
  value,
  onValueChange,
  availableSlots = [],
  placeholder = "Seleccionar hora",
  disabled = false,
  allowManualInput = true,
}: TimeSelectorProps) {
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualTime, setManualTime] = useState("");

  const handleManualSubmit = () => {
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(manualTime)) {
      // Ensure 2-digit format
      const [hours, minutes] = manualTime.split(":");
      const formattedTime = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
      onValueChange(formattedTime);
      setManualInputOpen(false);
      setManualTime("");
    }
  };

  // Filter out empty strings from availableSlots
  const validSlots = availableSlots.filter(slot => slot && slot.trim() !== "");
  // Use undefined instead of empty string for empty values
  const selectValue = value && value.trim() !== "" ? value : undefined;

  return (
    <div className="flex gap-2 items-center">
      <div className="flex-1">
        <Select value={selectValue} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {validSlots.length > 0 ? (
              validSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  {time}
                </SelectItem>
              ))
            ) : (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No hay horarios disponibles
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
      
      {allowManualInput && (
        <Popover open={manualInputOpen} onOpenChange={setManualInputOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={disabled}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Escribir hora manualmente</label>
                <Input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  placeholder="HH:MM"
                  className="w-full"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={handleManualSubmit}
                className="w-full"
                size="sm"
              >
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
