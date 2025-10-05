import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ScheduleCell } from "./ScheduleCell";

interface Employee {
  id: string;
  name: string;
  position?: string;
}

interface Vacation {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
}

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

interface WeeklyScheduleViewProps {
  businessId: string;
}

export const WeeklyScheduleView = ({ businessId }: WeeklyScheduleViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Lunes
  );

  useEffect(() => {
    loadData();
  }, [businessId, currentWeekStart]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadEmployees(), loadSchedules(), loadVacations()]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("id, name, position")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Error al cargar empleados");
    }
  };

  const loadSchedules = async () => {
    try {
      const weekEnd = addDays(currentWeekStart, 6);
      const { data, error } = await supabase
        .from("employee_weekly_schedules")
        .select("*")
        .gte("date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Error al cargar horarios");
    }
  };

  const loadVacations = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_vacations")
        .select("id, employee_id, start_date, end_date");

      if (error) throw error;
      setVacations(data || []);
    } catch (error) {
      console.error("Error loading vacations:", error);
    }
  };

  const isOnVacation = (employeeId: string, date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return vacations.some((vacation) => {
      if (vacation.employee_id !== employeeId) return false;
      
      const startDate = new Date(vacation.start_date);
      const endDate = new Date(vacation.end_date);
      const checkDate = new Date(dateStr);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const getScheduleForDay = (employeeId: string, date: Date): Schedule | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.find(
      (schedule) =>
        schedule.employee_id === employeeId && schedule.date === dateStr
    );
  };

  const updateSchedule = async (schedule: Schedule) => {
    try {
      const { error } = await supabase
        .from("employee_weekly_schedules")
        .upsert({
          ...schedule,
          date: schedule.date,
        });

      if (error) throw error;
      toast.success("Horario actualizado");
      loadSchedules();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Error al actualizar horario");
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-1/3" />
          <div className="h-96 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Horarios Semanales</h2>
          <p className="text-muted-foreground">Gestiona los horarios de tus empleados</p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="font-semibold">
              {format(currentWeekStart, "d 'de' MMMM", { locale: es })} -{" "}
              {format(addDays(currentWeekStart, 6), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {employees.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No hay empleados activos. Añade empleados en la sección de Empleados.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-semibold min-w-[150px] sticky left-0 bg-card z-10">
                  Empleado
                </th>
                {weekDays.map((day) => (
                  <th key={day.toISOString()} className="p-4 text-center font-semibold min-w-[180px]">
                    <div>{format(day, "EEEE", { locale: es })}</div>
                    <div className="text-sm font-normal text-muted-foreground">
                      {format(day, "d MMM yyyy", { locale: es })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-muted/50">
                  <td className="p-4 sticky left-0 bg-card z-10">
                    <div className="font-medium">{employee.name}</div>
                    {employee.position && (
                      <div className="text-sm text-muted-foreground">{employee.position}</div>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const onVacation = isOnVacation(employee.id, day);
                    const schedule = getScheduleForDay(employee.id, day);

                    return (
                      <td key={`${employee.id}-${day.toISOString()}`} className="p-2">
                        <ScheduleCell
                          employeeId={employee.id}
                          date={day}
                          schedule={schedule}
                          onVacation={onVacation}
                          onUpdate={updateSchedule}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
