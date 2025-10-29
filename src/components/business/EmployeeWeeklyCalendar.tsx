import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface EmployeeWeeklyCalendarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
  schedules: Schedule[];
  weekStart: Date;
  businessId: string;
}

const DAYS_OF_WEEK = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function EmployeeWeeklyCalendar({
  open,
  onOpenChange,
  employee,
  schedules,
  weekStart,
  businessId,
}: EmployeeWeeklyCalendarProps) {
  const [businessHours, setBusinessHours] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (open && businessId) {
      loadBusinessHours();
    }
  }, [open, businessId]);

  const loadBusinessHours = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("availability_slots")
        .select("day_of_week, start_time, end_time")
        .eq("business_id", businessId);

      if (error) throw error;
      setBusinessHours(data || []);
    } catch (error) {
      console.error("Error loading business hours:", error);
    } finally {
      setLoading(false);
    }
  };

  // Convert time string "HH:MM" to decimal hours
  // If extendPastMidnight is true, treats early morning hours (0-6) as next day (24-30)
  const timeToDecimal = (time: string, extendPastMidnight: boolean = false): number => {
    const [hours = 0, minutes = 0] = time.split(":").map(Number);
    const decimal = hours + minutes / 60;
    
    // If we're extending past midnight and hours are in early morning (0-6 AM)
    // treat them as the next day (24-30)
    if (extendPastMidnight && hours >= 0 && hours < 6) {
      return decimal + 24;
    }
    
    return decimal;
  };

  // Calculate the earliest and latest hours from business hours AND employee schedules
  const getBusinessHoursRange = () => {
    let earliest = 24;
    let latest = 0;

    // Check business hours
    businessHours.forEach((slot) => {
      const start = timeToDecimal(slot.start_time);
      let end = timeToDecimal(slot.end_time);
      
      // If end time is before start time, it means it crosses midnight
      if (end <= start) {
        end = timeToDecimal(slot.end_time, true); // Extend past midnight
      }
      
      if (start < earliest) earliest = start;
      if (end > latest) latest = end;
    });

    // Check employee schedules for this week
    schedules.forEach((schedule) => {
      if (schedule.start_time && schedule.end_time && !schedule.is_day_off) {
        const start = timeToDecimal(schedule.start_time);
        let end = timeToDecimal(schedule.end_time);
        
        // If end time is before or equal to start time, it crosses midnight
        if (end <= start) {
          end = timeToDecimal(schedule.end_time, true);
        }
        
        if (start < earliest) earliest = start;
        if (end > latest) latest = end;
      }
    });

    // If no events found, default to 0-24
    if (earliest === 24 && latest === 0) {
      return { earliest: 0, latest: 24 };
    }

    // Round down earliest to nearest hour and round up latest to nearest hour
    return {
      earliest: Math.floor(earliest),
      latest: Math.ceil(latest),
    };
  };

  const { earliest: startHour, latest: endHour } = getBusinessHoursRange();
  const totalHours = endHour - startHour;
  const displayHours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  // Get business hours for a specific day
  const getBusinessHoursForDay = (dayOfWeek: number): AvailabilitySlot[] => {
    return businessHours.filter((slot) => slot.day_of_week === dayOfWeek);
  };

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date): Schedule[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter(
      (schedule) => schedule.date === dateStr && !schedule.is_day_off
    );
  };

  // Get continuous business hour blocks for a day
  const getBusinessHourBlocks = (dayOfWeek: number): { start: number; end: number }[] => {
    const daySlots = getBusinessHoursForDay(dayOfWeek);
    if (daySlots.length === 0) return [];

    const blocks: { start: number; end: number }[] = [];
    
    daySlots.forEach((slot) => {
      const start = timeToDecimal(slot.start_time);
      let end = timeToDecimal(slot.end_time);
      
      // If end is before or equal to start, it crosses midnight
      if (end <= start) {
        end = timeToDecimal(slot.end_time, true);
      }
      
      blocks.push({ start, end });
    });

    // Sort blocks by start time
    blocks.sort((a, b) => a.start - b.start);

    // Merge overlapping blocks
    const merged: { start: number; end: number }[] = [];
    blocks.forEach((block) => {
      if (merged.length === 0) {
        merged.push(block);
      } else {
        const last = merged[merged.length - 1];
        if (last && block.start <= last.end) {
          // Overlapping, merge
          last.end = Math.max(last.end, block.end);
        } else {
          // Not overlapping, add new block
          merged.push(block);
        }
      }
    });

    return merged;
  };

  // Render time blocks for a day
  const renderDayBlocks = (date: Date, dayIndex: number) => {
    const daySchedules = getSchedulesForDate(date);
    
    if (daySchedules.length === 0) {
      return null;
    }

    return daySchedules.map((schedule, index) => {
      if (!schedule.start_time || !schedule.end_time) return null;

      const startDecimal = timeToDecimal(schedule.start_time);
      let endDecimal = timeToDecimal(schedule.end_time);
      
      // If end time is before or equal to start time, it crosses midnight
      if (endDecimal <= startDecimal) {
        endDecimal = timeToDecimal(schedule.end_time, true);
      }
      
      // Calculate position relative to business hours range
      const topPosition = ((startDecimal - startHour) / totalHours) * 100;
      const height = ((endDecimal - startDecimal) / totalHours) * 100;

      return (
        <div
          key={schedule.id || `${dayIndex}-${index}`}
          className={cn(
            "absolute left-0 right-0 mx-1 rounded-md p-2 text-white text-xs font-medium shadow-lg border-l-4",
            "flex flex-col justify-center items-center z-10",
            "bg-blue-500/90 border-blue-600"
          )}
          style={{
            top: `${topPosition}%`,
            height: `${height}%`,
            minHeight: "24px",
          }}
        >
          <span className="truncate w-full text-center font-semibold text-[11px]">
            {schedule.start_time?.substring(0, 5)} - {schedule.end_time?.substring(0, 5)}
          </span>
        </div>
      );
    });
  };

  if (loading) {
    return null;
  }

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
          <div className="grid grid-cols-8 gap-0 border border-border rounded-lg overflow-hidden">
            {/* Time column */}
            <div className="col-span-1 bg-muted/30 border-r border-border">
              <div className="h-12 border-b border-border flex items-center justify-center font-semibold text-sm">
                Hora
              </div>
              <div className="relative" style={{ height: `${totalHours * 40}px` }}>
                {displayHours.map((hour) => {
                  // Display hours > 24 as next day hours (e.g., 25 = 01:00, 26 = 02:00)
                  const displayHour = hour >= 24 ? hour - 24 : hour;
                  return (
                    <div
                      key={hour}
                      className="absolute w-full border-t border-border/50 flex items-start justify-end pr-2 text-xs text-muted-foreground font-medium"
                      style={{
                        top: `${((hour - startHour) / totalHours) * 100}%`,
                        height: `${100 / totalHours}%`,
                      }}
                    >
                      {displayHour.toString().padStart(2, "0")}:00
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Days columns */}
            {weekDays.map((day, dayIndex) => {
              const dayOfWeek = day.getDay();
              const daySchedules = getSchedulesForDate(day);
              const businessHoursForDay = getBusinessHoursForDay(dayOfWeek);
              const isDayOff = businessHoursForDay.length === 0;

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
                      isDayOff && "bg-muted/60"
                    )}
                    style={{ height: `${totalHours * 40}px` }}
                  >
                    {/* Hour grid */}
                    {displayHours.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-border/30"
                        style={{
                          top: `${((hour - startHour) / totalHours) * 100}%`,
                          height: `${100 / totalHours}%`,
                        }}
                      />
                    ))}

                    {/* Business hours blocks with borders */}
                    {!isDayOff && getBusinessHourBlocks(dayOfWeek).map((block, blockIndex) => {
                      const topPosition = ((block.start - startHour) / totalHours) * 100;
                      const height = ((block.end - block.start) / totalHours) * 100;
                      
                      return (
                        <div
                          key={`business-block-${blockIndex}`}
                          className="absolute left-0 right-0 border-2 border-blue-700/40 bg-blue-500/5 rounded-md z-0"
                          style={{
                            top: `${topPosition}%`,
                            height: `${height}%`,
                          }}
                        />
                      );
                    })}

                    {/* Day off message */}
                    {isDayOff && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium bg-background/80 px-3 py-1 rounded">
                          Local Cerrado
                        </span>
                      </div>
                    )}

                    {/* No schedule message for open days */}
                    {!isDayOff && daySchedules.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">
                          Sin turno
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

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-700/40 bg-blue-500/5 rounded-md" />
              <span>Horario del local</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500/90 border-l-4 border-blue-600 rounded" />
              <span>Turno del empleado</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
