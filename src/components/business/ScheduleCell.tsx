import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";

interface Schedule {
  id?: string;
  employee_id: string;
  date: string;
  is_day_off: boolean;
  start_time?: string;
  end_time?: string;
  slot_order?: number;
}

interface TimeSlot {
  id?: string;
  start: string;
  end: string;
  order: number;
}

interface ScheduleCellProps {
  employeeId: string;
  date: Date;
  schedules: Schedule[];
  onVacation: boolean;
  onUpdate: (schedule: Schedule) => void;
  onDelete: (scheduleId: string) => void;
}

export const ScheduleCell = ({
  employeeId,
  date,
  schedules,
  onVacation,
  onUpdate,
  onDelete,
}: ScheduleCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const dayOffSchedule = schedules.find(s => s.is_day_off);
  const timeSlots = schedules
    .filter(s => !s.is_day_off && s.start_time)
    .map(s => ({
      id: s.id,
      start: s.start_time!,
      end: s.end_time!,
      order: s.slot_order || 1,
    }))
    .sort((a, b) => a.order - b.order);

  const [isDayOff, setIsDayOff] = useState(!!dayOffSchedule);
  const [slots, setSlots] = useState<TimeSlot[]>(
    timeSlots.length > 0 ? timeSlots : [{ start: "", end: "", order: 1 }]
  );

  const handleAddSlot = () => {
    const newOrder = Math.max(...slots.map(s => s.order), 0) + 1;
    setSlots([...slots, { start: "", end: "", order: newOrder }]);
  };

  const handleRemoveSlot = (index: number) => {
    const slot = slots[index];
    if (slot.id) {
      onDelete(slot.id);
    }
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: "start" | "end", value: string) => {
    const newSlots = [...slots];
    newSlots[index][field] = value;
    setSlots(newSlots);
  };

  const handleSave = () => {
    const dateStr = format(date, "yyyy-MM-dd");

    // If day off is set, delete all time slots and create/update day off entry
    if (isDayOff) {
      // Delete all existing time slot schedules
      schedules.filter(s => !s.is_day_off && s.id).forEach(s => onDelete(s.id!));
      
      // Create or update day off schedule
      onUpdate({
        id: dayOffSchedule?.id,
        employee_id: employeeId,
        date: dateStr,
        is_day_off: true,
        slot_order: 1,
      });
    } else {
      // Delete day off schedule if it exists
      if (dayOffSchedule?.id) {
        onDelete(dayOffSchedule.id);
      }

      // Save all time slots
      slots.forEach((slot, index) => {
        if (slot.start && slot.end) {
          const existingSchedule = schedules.find(s => s.id === slot.id);
          onUpdate({
            id: slot.id,
            employee_id: employeeId,
            date: dateStr,
            is_day_off: false,
            start_time: slot.start,
            end_time: slot.end,
            slot_order: index + 1,
          });
        }
      });
    }
    
    setIsOpen(false);
  };

  const getCellContent = () => {
    if (onVacation) {
      return (
        <div className="text-xs text-center p-1.5 bg-accent/20 rounded border-2 border-accent">
          <div className="font-semibold text-accent-foreground text-[10px]">Vacaciones</div>
        </div>
      );
    }

    if (dayOffSchedule) {
      return (
        <div className="text-xs text-center p-1.5 bg-muted rounded border border-border">
          <div className="font-medium text-muted-foreground text-[10px]">Libre</div>
        </div>
      );
    }

    if (timeSlots.length > 0) {
      return (
        <div className="text-[10px] p-1.5 bg-card rounded border border-border hover:border-primary transition-colors">
          {timeSlots.map((slot, index) => (
            <div key={index} className="font-medium">
              {slot.start} - {slot.end}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="text-xs text-center p-1.5 bg-muted/50 rounded border border-dashed border-border hover:border-primary transition-colors">
        <div className="text-muted-foreground text-[10px]">-</div>
      </div>
    );
  };

  return (
    <>
      <div
        className="cursor-pointer"
        onClick={() => !onVacation && setIsOpen(true)}
      >
        {getCellContent()}
      </div>

      <Dialog open={isOpen && !onVacation} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Horario - {format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="day-off">Día Libre</Label>
              <Switch
                id="day-off"
                checked={isDayOff}
                onCheckedChange={setIsDayOff}
              />
            </div>

            {!isDayOff && (
              <div className="space-y-4">
                {slots.map((slot, index) => (
                  <div key={index} className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">Tramo {index + 1}</h4>
                      {slots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSlot(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Inicio</Label>
                        <TimePicker
                          time={slot.start}
                          onTimeChange={(value) => handleSlotChange(index, "start", value)}
                          allowClear
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fin</Label>
                        <TimePicker
                          time={slot.end}
                          onTimeChange={(value) => handleSlotChange(index, "end", value)}
                          allowClear
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={handleAddSlot}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Tramo
                </Button>
              </div>
            )}

            <Button onClick={handleSave} className="w-full">
              Guardar Horario
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
