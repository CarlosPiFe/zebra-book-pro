import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface CalendarViewProps {
  businessId: string;
}

const DAYS_OF_WEEK = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Example closed days (business can configure these)
const CLOSED_DAYS = [0]; // Sunday = 0

export function CalendarView({ businessId }: CalendarViewProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
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
    
    // Check if it's a closed day
    if (CLOSED_DAYS.includes(dayOfWeek)) {
      return;
    }

    // Navigate to bookings view with selected date
    const dateString = date.toISOString().split('T')[0];
    navigate(`/business/${businessId}/manage?view=bookings&date=${dateString}`);
  };

  const isClosedDay = (day: number) => {
    const date = new Date(year, month, day);
    return CLOSED_DAYS.includes(date.getDay());
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
        <CardContent className="p-6">
          {/* Navigation Controls */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={previousYear}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
                <ChevronLeft className="h-4 w-4 -ml-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={previousMonth}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {MONTHS[month]} {year}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={nextMonth}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextYear}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
                <ChevronRight className="h-4 w-4 -ml-3" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="space-y-2">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-muted-foreground p-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
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
                      "aspect-square p-2 rounded-lg text-center transition-all",
                      "hover:bg-accent/10 hover:scale-105",
                      closed && "bg-muted cursor-not-allowed opacity-50 hover:bg-muted hover:scale-100",
                      today && !closed && "bg-accent text-accent-foreground font-bold",
                      !closed && !today && "bg-background border border-border hover:border-accent"
                    )}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className={cn("text-lg", today && "font-bold")}>
                        {day}
                      </span>
                      {closed && (
                        <span className="text-xs text-muted-foreground mt-1">
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
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-accent" />
                <span>Día actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-background border border-border" />
                <span>Día disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted" />
                <span>Local cerrado</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
