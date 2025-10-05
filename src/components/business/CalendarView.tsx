import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CalendarViewProps {
  businessId: string;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export function CalendarView({ businessId }: CalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusinessHours();
  }, [businessId]);

  useEffect(() => {
    // Subscribe to realtime changes in availability_slots
    const channel = supabase
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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

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
    const dayOfWeek = date.getDay();
    
    // Check if it's a closed day (not in openDays)
    if (!openDays.includes(dayOfWeek)) {
      return;
    }

    // Navigate to bookings view with selected date
    const dateString = date.toISOString().split('T')[0];
    navigate(`/business/${businessId}/manage?view=bookings&date=${dateString}`);
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
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Calendario</h1>
          <p className="text-muted-foreground">
            Cargando horarios del negocio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Calendario</h1>
        <p className="text-muted-foreground">
          Navega por el calendario y haz clic en un día para ver sus reservas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendario de Reservas
          </CardTitle>
          <CardDescription>
            Haz clic en cualquier día para ver las reservas. Los días cerrados aparecen marcados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={previousYear}
              className="h-8 px-3 text-sm"
            >
              {year - 1}
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <h2 className="text-xl font-bold min-w-[200px] text-center">
                {MONTHS[month]} {year}
              </h2>
              
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-7 w-7"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={nextYear}
              className="h-8 px-3 text-sm"
            >
              {year + 1}
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-1">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground p-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} />;
                }

                const closed = isClosedDay(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={closed}
                    className={cn(
                      "aspect-square p-1 rounded text-center transition-all text-sm",
                      "hover:bg-accent/10 hover:scale-105",
                      closed && "bg-muted cursor-not-allowed opacity-50 hover:bg-muted hover:scale-100",
                      today && !closed && "bg-accent text-accent-foreground font-bold",
                      !closed && !today && "bg-background border border-border hover:border-accent"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={cn("text-sm", today && "font-bold")}>
                        {day}
                      </span>
                      {closed && (
                        <span className="text-[10px] text-muted-foreground">
                          Cerrado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-accent" />
                <span>Día actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-background border border-border" />
                <span>Día disponible</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-muted" />
                <span>Local cerrado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
