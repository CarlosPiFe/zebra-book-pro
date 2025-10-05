import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ScheduleCell } from "./ScheduleCell";
import { cn } from "@/lib/utils";

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
  start_time?: string;
  end_time?: string;
  slot_order?: number;
}

interface WeeklyScheduleViewProps {
  businessId: string;
}

interface CopiedSchedule {
  employeeId: string;
  schedules: Schedule[];
  selectedDates: string[]; // Array of date strings in yyyy-MM-dd format
}

export const WeeklyScheduleView = ({ businessId }: WeeklyScheduleViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Lunes
  );
  const [copiedSchedule, setCopiedSchedule] = useState<CopiedSchedule | null>(null);

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
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("slot_order", { ascending: true });

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

  const getSchedulesForDay = (employeeId: string, date: Date): Schedule[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return schedules.filter(
      (schedule) =>
        schedule.employee_id === employeeId && schedule.date === dateStr
    );
  };

  const updateSchedule = async (schedule: Schedule) => {
    try {
      if (schedule.id) {
        const { error } = await supabase
          .from("employee_weekly_schedules")
          .update(schedule)
          .eq("id", schedule.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employee_weekly_schedules")
          .insert(schedule);
        
        if (error) throw error;
      }
      
      toast.success("Horario actualizado");
      loadSchedules();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Error al actualizar horario");
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from("employee_weekly_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;
      toast.success("Tramo eliminado");
      await loadSchedules(); // Wait for reload to complete
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Error al eliminar tramo");
    }
  };

  const handleCopySchedule = (employeeId: string, date: Date, schedulesToCopy: Schedule[]) => {
    setCopiedSchedule({
      employeeId,
      schedules: schedulesToCopy,
      selectedDates: [],
    });
    toast.success("Horario copiado. Selecciona los días donde quieres pegarlo.");
  };

  const toggleDateSelection = (employeeId: string, date: Date) => {
    if (!copiedSchedule || copiedSchedule.employeeId !== employeeId) return;
    
    const dateStr = format(date, "yyyy-MM-dd");
    const isSelected = copiedSchedule.selectedDates.includes(dateStr);
    
    setCopiedSchedule({
      ...copiedSchedule,
      selectedDates: isSelected
        ? copiedSchedule.selectedDates.filter(d => d !== dateStr)
        : [...copiedSchedule.selectedDates, dateStr],
    });
  };

  const handleApplySchedule = async () => {
    if (!copiedSchedule || copiedSchedule.selectedDates.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    try {
      // Apply schedule to all selected dates
      for (const dateStr of copiedSchedule.selectedDates) {
        // Delete existing schedules for this day
        const existingSchedules = schedules.filter(
          s => s.employee_id === copiedSchedule.employeeId && s.date === dateStr && s.id
        );
        
        if (existingSchedules.length > 0) {
          const { error: deleteError } = await supabase
            .from("employee_weekly_schedules")
            .delete()
            .in('id', existingSchedules.map(s => s.id!));
          
          if (deleteError) throw deleteError;
        }

        // Insert new schedules for this day
        const newSchedules = copiedSchedule.schedules.map((schedule, index) => ({
          employee_id: copiedSchedule.employeeId,
          date: dateStr,
          is_day_off: false,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          slot_order: index + 1,
        }));

        const { error: insertError } = await supabase
          .from("employee_weekly_schedules")
          .insert(newSchedules);
        
        if (insertError) throw insertError;
      }

      toast.success(`Horario aplicado a ${copiedSchedule.selectedDates.length} día(s)`);
      setCopiedSchedule(null);
      await loadSchedules(); // Reload schedules after all operations
    } catch (error) {
      console.error("Error applying schedule:", error);
      toast.error("Error al aplicar horario");
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
    <div className="space-y-6 relative">
      {/* Overlay cuando está en modo de pegar */}
      {copiedSchedule && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 pointer-events-none" />
      )}
      
      <div className="flex items-center justify-between relative z-50">
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
      
      {/* Barra de acción para pegar horario */}
      {copiedSchedule && (
        <Card className="p-4 border-2 border-primary bg-primary/5 relative z-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Modo: Pegar Horario</h3>
              <p className="text-sm text-muted-foreground">
                {copiedSchedule.selectedDates.length > 0 
                  ? `${copiedSchedule.selectedDates.length} día(s) seleccionado(s)`
                  : "Haz clic en las casillas del empleado para seleccionar los días donde pegar el horario"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCopiedSchedule(null)}
              >
                Cancelar
              </Button>
              {copiedSchedule.selectedDates.length > 0 && (
                <Button onClick={handleApplySchedule}>
                  Aplicar a {copiedSchedule.selectedDates.length} día(s)
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {employees.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No hay empleados activos. Añade empleados en la sección de Empleados.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto relative z-50">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-semibold w-32 sticky left-0 bg-card z-10">
                  Empleado
                </th>
                {weekDays.map((day) => (
                  <th key={day.toISOString()} className="p-2 text-center font-semibold w-28">
                    <div className="text-sm">{format(day, "EEE", { locale: es })}</div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {format(day, "d MMM", { locale: es })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 sticky left-0 bg-card z-10">
                    <div className="font-medium text-sm">{employee.name}</div>
                    {employee.position && (
                      <div className="text-xs text-muted-foreground">{employee.position}</div>
                    )}
                  </td>
                  {weekDays.map((day) => {
                    const onVacation = isOnVacation(employee.id, day);
                    const daySchedules = getSchedulesForDay(employee.id, day);
                    const hasCopiedSchedule = copiedSchedule?.employeeId === employee.id;
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isSelected = copiedSchedule?.selectedDates.includes(dateStr);

                    return (
                      <td 
                        key={`${employee.id}-${day.toISOString()}`} 
                        className="p-1"
                        onClick={() => {
                          if (hasCopiedSchedule && !onVacation) {
                            toggleDateSelection(employee.id, day);
                          }
                        }}
                      >
                        <ScheduleCell
                          employeeId={employee.id}
                          date={day}
                          schedules={daySchedules}
                          onVacation={onVacation}
                          onUpdate={updateSchedule}
                          onDelete={deleteSchedule}
                          onCopy={handleCopySchedule}
                          isInSelectionMode={hasCopiedSchedule && !onVacation}
                          isSelected={isSelected}
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
