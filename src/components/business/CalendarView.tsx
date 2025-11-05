import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { DayDetailsDialog } from "./DayDetailsDialog";
import { format } from "date-fns";

interface CalendarViewProps {
  businessId: string;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface CalendarEvent {
  id: string;
  event_date: string;
  color: string;
}

export function CalendarView({ businessId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [monthEvents, setMonthEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    loadBusinessHours();
    loadMonthEvents();
  }, [businessId, currentDate]);

  useEffect(() => {
    // Subscribe to realtime changes in availability_slots and calendar_events
    const availabilityChannel = supabase
      .channel('availability-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_slots',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          loadBusinessHours();
        }
      )
      .subscribe();

    const eventsChannel = supabase
      .channel('calendar-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `business_id=eq.${businessId}`
        },
        () => {
          loadMonthEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(availabilityChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [businessId, currentDate]);

  const loadBusinessHours = async () => {
    try {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("day_of_week")
        .eq("business_id", businessId);

      if (error) throw error;

      // Get unique days that are open
      const uniqueOpenDays = [...new Set(data?.map(slot => slot.day_of_week) || [])];
      setOpenDays(uniqueOpenDays);
    } catch (error) {
      console.error("Error loading business hours:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthEvents = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, event_date, color")
        .eq("business_id", businessId)
        .gte("event_date", format(firstDay, "yyyy-MM-dd"))
        .lte("event_date", format(lastDay, "yyyy-MM-dd"));

      if (error) throw error;
      setMonthEvents((data || []) as CalendarEvent[]);
    } catch (error) {
      console.error("Error loading month events:", error);
    }
  };
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Get day of week (0-6, where 0 is Sunday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  // Adjust to Monday start (0 = Monday, 6 = Sunday)
  const startingDayIndex = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const previousYear = () => {
    setCurrentDate(new Date(year - 1, month, 1));
  };

  const nextYear = () => {
    setCurrentDate(new Date(year + 1, month, 1));
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const isClosedDay = (day: number) => {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return !openDays.includes(dayOfWeek);
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const getDayEvents = (day: number) => {
    const dateStr = format(new Date(year, month, day), "yyyy-MM-dd");
    return monthEvents.filter(event => event.event_date === dateStr);
  };

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of month
  for (let i = 0; i < startingDayIndex; i++) {
    calendarDays.push(null);
  }
  
  // Add actual days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Calendario</h1>
        <p className="text-muted-foreground">
          Navega por el calendario y haz clic en un día para ver sus eventos, horarios o reservas
        </p>
      </div>

      <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-6 flex-1 flex flex-col">
          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <Button
              variant="secondary"
              size="default"
              onClick={previousYear}
              className="px-6 font-semibold"
            >
              {year - 1}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <h2 className="text-2xl font-bold min-w-[240px] text-center text-foreground">
              {MONTHS[month]} {year}
            </h2>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            <Button
              variant="secondary"
              size="default"
              onClick={nextYear}
              className="px-6 font-semibold"
            >
              {year + 1}
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground py-3 bg-muted/30 rounded-lg"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2 flex-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="min-h-[100px]" />;
                }

                const closed = isClosedDay(day);
                const today = isToday(day);
                const dayEvents = getDayEvents(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "w-full p-4 rounded-xl text-center transition-all min-h-[100px] flex flex-col items-center justify-center gap-2",
                      "border-2 backdrop-blur-sm",
                      closed && "bg-muted/50 border-border/50 opacity-60",
                      today && !closed && "bg-primary/80 border-primary text-primary-foreground font-bold shadow-lg",
                      !closed && !today && "bg-card/30 border-border/50 hover:border-primary/50 hover:bg-card/50 hover:shadow-md",
                      !today && !closed && "hover:scale-[1.02]"
                    )}
                  >
                    <span className={cn(
                      "text-2xl font-bold",
                      today && "text-3xl",
                      closed && "text-muted-foreground"
                    )}>
                      {day}
                    </span>
                    {closed && (
                      <span className="text-xs text-muted-foreground">
                        Cerrado
                      </span>
                    )}
                    {!closed && dayEvents.length > 0 && (
                      <div className="flex gap-1 flex-wrap justify-center">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: event.color }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-xs text-muted-foreground ml-1">
                            +{dayEvents.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/80 border-2 border-primary" />
                <span className="text-foreground">Día actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-card/30 border-2 border-border/50" />
                <span className="text-foreground">Día disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-muted/50 border-2 border-border/50 opacity-60" />
                <span className="text-foreground">Local cerrado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <DayDetailsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          date={selectedDate}
          businessId={businessId}
          isClosed={isClosedDay(selectedDate.getDate())}
          onEventChange={loadMonthEvents}
        />
      )}
    </div>
  );
}
