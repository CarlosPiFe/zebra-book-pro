import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks } from "date-fns";
import { es } from "date-fns/locale";

interface EmployeeScheduleViewProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeScheduleView = ({ employeeId, businessId }: EmployeeScheduleViewProps) => {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [vacations, setVacations] = useState<any[]>([]);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Helper function to format time without seconds
  const formatTime = (timeString: string) => {
    if (!timeString) return "";
    return timeString.substring(0, 5); // Get only HH:MM
  };

  useEffect(() => {
    loadSchedules();
    loadVacations();
  }, [currentWeek, employeeId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const weekEnd = addDays(currentWeek, 6);
      
      const { data, error } = await supabase
        .from("employee_weekly_schedules")
        .select("*")
        .eq("employee_id", employeeId)
        .gte("date", format(currentWeek, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
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
      const weekEnd = addDays(currentWeek, 6);
      
      const { data, error } = await supabase
        .from("employee_vacations")
        .select("*")
        .eq("employee_id", employeeId)
        .or(`and(start_date.lte.${format(weekEnd, "yyyy-MM-dd")},end_date.gte.${format(currentWeek, "yyyy-MM-dd")})`);

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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, -1))}
          >
            <ChevronLeft className="w-4 h-4" />
            Semana anterior
          </Button>
          
          <h3 className="font-semibold">
            {format(currentWeek, "d MMM", { locale: es })} - {format(addDays(currentWeek, 6), "d MMM yyyy", { locale: es })}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          >
            Semana siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const schedule = getScheduleForDay(day);
          const onVacation = isOnVacation(day);
          const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

          return (
            <Card
              key={day.toISOString()}
              className={`p-4 ${isToday ? "border-primary border-2" : ""}`}
            >
              <div className="text-center mb-2">
                <p className="font-semibold">{format(day, "EEE", { locale: es })}</p>
                <p className="text-sm text-muted-foreground">{format(day, "d MMM", { locale: es })}</p>
              </div>

              {onVacation ? (
                <div className="bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                  <p className="font-medium text-sm text-yellow-800 dark:text-yellow-200">
                    Vacaciones
                  </p>
                </div>
              ) : schedule && !schedule.is_day_off ? (
                <div className="bg-primary/10 rounded-lg p-3 text-center">
                  <p className="font-medium text-sm">
                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Día libre</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};
