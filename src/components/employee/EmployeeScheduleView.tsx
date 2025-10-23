import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";

interface EmployeeScheduleViewProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeScheduleView = ({ employeeId, businessId }: EmployeeScheduleViewProps) => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  // Helper function to format time without seconds
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString.substring(0, 5); // Get only HH:MM
  };

  useEffect(() => {
    loadSchedules();
    loadVacations();
  }, [currentWeek, currentMonth, employeeId, viewMode]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      let startDate, endDate;
      
      if (viewMode === "weekly") {
        startDate = currentWeek;
        endDate = addDays(currentWeek, 6);
      } else {
        startDate = currentMonth;
        endDate = endOfMonth(currentMonth);
      }
      
      const { data, error } = await supabase
        .from("employee_weekly_schedules")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("date");

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  const loadVacations = async () => {
    try {
      let startDate, endDate;
      
      if (viewMode === "weekly") {
        startDate = currentWeek;
        endDate = addDays(currentWeek, 6);
      } else {
        startDate = currentMonth;
        endDate = endOfMonth(currentMonth);
      }
      
      const { data, error } = await supabase
        .from("employee_vacations")
        .select("*")
        .eq("employee_id", employeeId)
        .or(`and(start_date.lte.${format(endDate, "yyyy-MM-dd")},end_date.gte.${format(startDate, "yyyy-MM-dd")})`);

      if (error) throw error;
      setVacations(data || []);
    } catch (error) {
      console.error("Error loading vacations:", error);
      toast.error("Error al cargar vacaciones");
    }
  };

  const getScheduleForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.find(s => s.date === dateStr);
  };

  const isOnVacation = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return vacations.some(v => 
      dateStr >= v.start_date && dateStr <= v.end_date
    );
  };

  const getDaysToDisplay = () => {
    if (viewMode === "weekly") {
      return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
    } else {
      const monthStart = currentMonth;
      const monthEnd = endOfMonth(currentMonth);
      const daysInMonth = monthEnd.getDate();
      const firstDayOfWeek = monthStart.getDay(); // 0 = domingo, 1 = lunes, etc.
      const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // ajustar para que lunes sea 0
      
      // Crear array con nulls para los días antes del inicio del mes
      const emptyDays = Array(startOffset).fill(null);
      const monthDays = Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i));
      
      return [...emptyDays, ...monthDays];
    }
  };

  const displayDays = getDaysToDisplay();

  const handlePrevious = () => {
    if (viewMode === "weekly") {
      setCurrentWeek(addWeeks(currentWeek, -1));
    } else {
      setCurrentMonth(addMonths(currentMonth, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === "weekly") {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else {
      setCurrentMonth(addMonths(currentMonth, 1));
    }
  };

  const getDateRangeText = () => {
    if (viewMode === "weekly") {
      return `${format(currentWeek, "d MMM", { locale: es })} - ${format(addDays(currentWeek, 6), "d MMM yyyy", { locale: es })}`;
    } else {
      return format(currentMonth, "MMMM yyyy", { locale: es });
    }
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Navigation and View Toggle - Más compacto en móvil */}
      <Card className="p-2.5 md:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 md:gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            className="text-xs md:text-sm w-full sm:w-auto"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">{viewMode === "weekly" ? "Anterior" : "Mes ant."}</span>
            <span className="sm:hidden">←</span>
          </Button>
          
          <div className="flex items-center gap-2 md:gap-3 flex-1 justify-center">
            <h3 className="font-semibold text-xs md:text-base text-center">
              {getDateRangeText()}
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewMode(viewMode === "weekly" ? "monthly" : "weekly")}
              className="text-xs md:text-sm"
            >
              <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1" />
              {viewMode === "weekly" ? "Mes" : "Sem"}
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            className="text-xs md:text-sm w-full sm:w-auto"
          >
            <span className="hidden sm:inline">{viewMode === "weekly" ? "Siguiente" : "Mes sig."}</span>
            <span className="sm:hidden">→</span>
            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>
      </Card>

      {/* Day of Week Headers - Más compactos en móvil */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 px-1">
        {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
          <div key={index} className="text-center font-semibold text-xs md:text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Schedule Grid - Más compacto en móvil */}
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {displayDays.map((day, index) => {
          // Si day es null (espacio vacío), renderizar celda vacía
          if (!day) {
            return <div key={`empty-${index}`} className="min-h-[60px] md:min-h-[100px]" />;
          }

          const schedule = getScheduleForDay(day);
          const onVacation = isOnVacation(day);
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

          return (
            <Card
              key={`day-${format(day, "yyyy-MM-dd")}`}
              className={`p-1.5 md:p-3 min-h-[60px] md:min-h-[100px] ${
                isToday ? "ring-2 ring-primary" : ""
              }`}
            >
              <p className="text-xs md:text-sm font-semibold mb-1 md:mb-2">
                {format(day, "d")}
              </p>
              
              {onVacation ? (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded px-1 py-0.5 md:px-2 md:py-1 text-center">
                  <p className="text-[10px] md:text-xs font-medium text-yellow-800 dark:text-yellow-200">Vacaciones</p>
                </div>
              ) : schedule && !schedule.is_day_off ? (
                <div className="bg-primary/10 rounded px-1 py-0.5 md:px-2 md:py-1 text-center">
                  <p className="font-medium text-[9px] md:text-xs leading-tight">
                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </p>
                </div>
              ) : (
                <div className="bg-muted rounded px-1 py-0.5 md:px-2 md:py-1 text-center">
                  <p className="text-[10px] md:text-xs text-muted-foreground">Libre</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
