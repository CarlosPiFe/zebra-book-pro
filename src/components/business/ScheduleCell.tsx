import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Schedule {
  id?: string;
  employee_id: string;
  date: string;
  is_day_off: boolean;
  morning_start?: string;
  morning_end?: string;
  afternoon_start?: string;
  afternoon_end?: string;
}

interface ScheduleCellProps {
  employeeId: string;
  date: Date;
  schedule?: Schedule;
  onVacation: boolean;
  onUpdate: (schedule: Schedule) => void;
}

export const ScheduleCell = ({
  employeeId,
  date,
  schedule,
  onVacation,
  onUpdate,
}: ScheduleCellProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDayOff, setIsDayOff] = useState(schedule?.is_day_off || false);
  const [morningStart, setMorningStart] = useState(schedule?.morning_start || "");
  const [morningEnd, setMorningEnd] = useState(schedule?.morning_end || "");
  const [afternoonStart, setAfternoonStart] = useState(schedule?.afternoon_start || "");
  const [afternoonEnd, setAfternoonEnd] = useState(schedule?.afternoon_end || "");

  const handleSave = () => {
    const dateStr = format(date, "yyyy-MM-dd");
    onUpdate({
      id: schedule?.id,
      employee_id: employeeId,
      date: dateStr,
      is_day_off: isDayOff,
      morning_start: isDayOff ? undefined : morningStart || undefined,
      morning_end: isDayOff ? undefined : morningEnd || undefined,
      afternoon_start: isDayOff ? undefined : afternoonStart || undefined,
      afternoon_end: isDayOff ? undefined : afternoonEnd || undefined,
    });
    setIsOpen(false);
  };

  const getCellContent = () => {
    if (onVacation) {
      return (
        <div className="text-xs text-center p-2 bg-accent/20 rounded border-2 border-accent">
          <div className="font-semibold text-accent-foreground">Vacaciones</div>
        </div>
      );
    }

    if (schedule?.is_day_off) {
      return (
        <div className="text-xs text-center p-2 bg-muted rounded border border-border">
          <div className="font-medium text-muted-foreground">Libre</div>
        </div>
      );
    }

    if (schedule?.morning_start || schedule?.afternoon_start) {
      return (
        <div className="text-xs p-2 bg-card rounded border border-border hover:border-primary transition-colors">
          {schedule.morning_start && (
            <div className="font-medium">
              {schedule.morning_start} - {schedule.morning_end}
            </div>
          )}
          {schedule.afternoon_start && (
            <div className="font-medium">
              {schedule.afternoon_start} - {schedule.afternoon_end}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="text-xs text-center p-2 bg-muted/50 rounded border border-dashed border-border hover:border-primary transition-colors">
        <div className="text-muted-foreground">Sin horario</div>
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

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
              <>
                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold">Horario de Mañana</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Inicio</Label>
                      <TimePicker
                        time={morningStart}
                        onTimeChange={setMorningStart}
                        allowClear
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <TimePicker
                        time={morningEnd}
                        onTimeChange={setMorningEnd}
                        allowClear
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold">Horario de Tarde</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Inicio</Label>
                      <TimePicker
                        time={afternoonStart}
                        onTimeChange={setAfternoonStart}
                        allowClear
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fin</Label>
                      <TimePicker
                        time={afternoonEnd}
                        onTimeChange={setAfternoonEnd}
                        allowClear
                      />
                    </div>
                  </div>
                </div>
              </>
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
