import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Schedule {
  id?: string;
  employee_id: string;
  date: string;
  is_day_off: boolean;
  start_time?: string;
  end_time?: string;
  slot_order?: number;
}

interface Employee {
  id: string;
  name: string;
  position?: string;
}

interface EmployeeWeeklyCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  schedules: Schedule[];
  weekStart: Date;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours
const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function EmployeeWeeklyCalendar({
  open,
  onOpenChange,
  employee,
  schedules,
  weekStart,
}: EmployeeWeeklyCalendarProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Convert time string "HH:MM" to decimal hours
  const timeToDecimal = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours + minutes / 60;
  };

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter(
      (schedule) => schedule.date === dateStr && !schedule.is_day_off
    );
  };

  // Render time blocks for a day
  const renderDayBlocks = (date: Date, dayIndex: number) => {
    const daySchedules = getSchedulesForDate(date);
    
    if (daySchedules.length === 0) {
      return null;
    }

    return daySchedules.map((schedule, index) => {
      if (!schedule.start_time || !schedule.end_time) return null;

      const startHour = timeToDecimal(schedule.start_time);
      const endHour = timeToDecimal(schedule.end_time);
      const duration = endHour - startHour;

      // Calculate position and height
      const topPosition = (startHour / 24) * 100;
      const height = (duration / 24) * 100;

      // Generate a color based on the schedule index for visual variety
      const colors = [
        "bg-blue-500/80",
        "bg-green-500/80",
        "bg-purple-500/80",
        "bg-orange-500/80",
        "bg-pink-500/80",
      ];
      const colorClass = colors[index % colors.length];

      return (
        <div
          key={schedule.id || `${dayIndex}-${index}`}
          className={cn(
            "absolute left-0 right-0 mx-1 rounded-md p-2 text-white text-xs font-medium shadow-md",
            "flex flex-col justify-center items-center",
            colorClass
          )}
          style={{
            top: `${topPosition}%`,
            height: `${height}%`,
            minHeight: "30px",
          }}
        >
          <span className="truncate w-full text-center">
            {schedule.start_time} - {schedule.end_time}
          </span>
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Horario de {employee.name}
            {employee.position && (
              <span className="text-sm text-muted-foreground ml-2">
                ({employee.position})
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Semana del {format(weekStart, "d 'de' MMMM", { locale: es })} al{" "}
            {format(addDays(weekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-8 gap-0 border border-border rounded-lg overflow-hidden min-h-[600px]">
            {/* Time column */}
            <div className="col-span-1 bg-muted/30 border-r border-border">
              <div className="h-12 border-b border-border flex items-center justify-center font-semibold text-sm">
                Hora
              </div>
              <div className="relative" style={{ height: "calc(24 * 60px)" }}>
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute w-full border-t border-border/50 flex items-start justify-end pr-2 text-xs text-muted-foreground"
                    style={{
                      top: `${(hour / 24) * 100}%`,
                      height: `${100 / 24}%`,
                    }}
                  >
                    {hour.toString().padStart(2, "0")}:00
                  </div>
                ))}
              </div>
            </div>

            {/* Days columns */}
            {weekDays.map((day, dayIndex) => {
              const daySchedules = getSchedulesForDate(day);
              const isDayOff = daySchedules.length === 0 || 
                schedules.some(s => s.date === format(day, "yyyy-MM-dd") && s.is_day_off);

              return (
                <div key={dayIndex} className="col-span-1 border-r border-border last:border-r-0">
                  {/* Day header */}
                  <div className="h-12 border-b border-border flex flex-col items-center justify-center bg-muted/20">
                    <span className="text-xs font-semibold">
                      {DAYS_OF_WEEK[dayIndex]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(day, "d MMM", { locale: es })}
                    </span>
                  </div>

                  {/* Day content */}
                  <div
                    className={cn(
                      "relative border-t-0",
                      isDayOff && "bg-muted/20"
                    )}
                    style={{ height: "calc(24 * 60px)" }}
                  >
                    {/* Hour grid lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-border/30"
                        style={{ top: `${(hour / 24) * 100}%` }}
                      />
                    ))}

                    {/* Day off message */}
                    {isDayOff && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          Día libre
                        </span>
                      </div>
                    )}

                    {/* Schedule blocks */}
                    {renderDayBlocks(day, dayIndex)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
