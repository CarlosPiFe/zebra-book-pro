import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { ScheduleCell } from "./ScheduleCell";
import { EmployeeWeeklyCalendar } from "./EmployeeWeeklyCalendar";
import { ExportSchedulesDialog } from "./ExportSchedulesDialog";
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
  schedules: Schedule[];
  selectedCells: Array<{ employeeId: string; date: string }>; // Array of selected cells
}

export const WeeklyScheduleView = ({ businessId }: WeeklyScheduleViewProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const weekStartParam = searchParams.get("weekStart");
    if (weekStartParam) {
      return new Date(weekStartParam);
    }
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  const [copiedSchedule, setCopiedSchedule] = useState<CopiedSchedule | null>(null);
  const [highlightedDate, setHighlightedDate] = useState<string | null>(() => {
    return searchParams.get("highlightDate");
  });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [deleteWeekDialogOpen, setDeleteWeekDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [businessId, currentWeekStart]);

  useEffect(() => {
    if (highlightedDate) {
      const timer = setTimeout(() => {
        setHighlightedDate(null);
        // Limpiar los parámetros de la URL para que no persistan
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("highlightDate");
        setSearchParams(newParams, { replace: true });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightedDate]);

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
      
      // Comparar strings directamente para evitar problemas de zona horaria
      // Las fechas en la base de datos ya están en formato YYYY-MM-DD sin hora
      return dateStr >= vacation.start_date && dateStr <= vacation.end_date;
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
      
      await loadSchedules(); // Always reload after update
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

  const deleteWeekSchedules = async () => {
    try {
      const weekEnd = addDays(currentWeekStart, 6);
      
      const { error } = await supabase
        .from("employee_weekly_schedules")
        .delete()
        .gte("date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"));

      if (error) throw error;
      
      toast.success("Todos los horarios de la semana han sido eliminados");
      setDeleteWeekDialogOpen(false);
      await loadSchedules();
    } catch (error) {
      console.error("Error deleting week schedules:", error);
      toast.error("Error al eliminar los horarios de la semana");
    }
  };

  const handleCopySchedule = (employeeId: string, date: Date, schedulesToCopy: Schedule[]) => {
    setCopiedSchedule({
      schedules: schedulesToCopy,
      selectedCells: [],
    });
    toast.success("Horario copiado. Haz clic en las celdas donde quieres pegarlo.");
  };

  const toggleCellSelection = (employeeId: string, date: Date) => {
    if (!copiedSchedule) return;
    
    const dateStr = format(date, "yyyy-MM-dd");
    const cellKey = `${employeeId}-${dateStr}`;
    const isSelected = copiedSchedule.selectedCells.some(
      cell => cell.employeeId === employeeId && cell.date === dateStr
    );
    
    setCopiedSchedule({
      ...copiedSchedule,
      selectedCells: isSelected
        ? copiedSchedule.selectedCells.filter(
            cell => !(cell.employeeId === employeeId && cell.date === dateStr)
          )
        : [...copiedSchedule.selectedCells, { employeeId, date: dateStr }],
    });
  };

  const handleApplySchedule = async () => {
    if (!copiedSchedule || copiedSchedule.selectedCells.length === 0) {
      toast.error("Selecciona al menos una celda");
      return;
    }

    try {
      // Apply schedule to all selected cells
      for (const cell of copiedSchedule.selectedCells) {
        // Delete existing schedules for this cell
        const existingSchedules = schedules.filter(
          s => s.employee_id === cell.employeeId && s.date === cell.date && s.id
        );
        
        if (existingSchedules.length > 0) {
          const { error: deleteError } = await supabase
            .from("employee_weekly_schedules")
            .delete()
            .in('id', existingSchedules.map(s => s.id!));
          
          if (deleteError) throw deleteError;
        }

        // Insert new schedules for this cell
        const newSchedules = copiedSchedule.schedules.map((schedule, index) => ({
          employee_id: cell.employeeId,
          date: cell.date,
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

      toast.success(`Horario aplicado a ${copiedSchedule.selectedCells.length} celda(s)`);
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 pointer-events-none" />
      )}
      
      <div className="space-y-4 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Horarios Semanales</h2>
            <p className="text-muted-foreground">Gestiona los horarios de tus empleados</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-center min-w-[200px]">
              <p className="font-semibold text-sm">
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

        <div className="flex justify-end gap-2">
          <Button
            variant="destructive"
            onClick={() => setDeleteWeekDialogOpen(true)}
            className="gap-2"
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar Semana
          </Button>
          <ExportSchedulesDialog businessId={businessId} />
        </div>
      </div>
      
      {/* Diálogo de confirmación para eliminar semana */}
      <AlertDialog open={deleteWeekDialogOpen} onOpenChange={setDeleteWeekDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará todos los horarios de la semana del{" "}
              <strong>{format(currentWeekStart, "d 'de' MMMM", { locale: es })}</strong> al{" "}
              <strong>{format(addDays(currentWeekStart, 6), "d 'de' MMMM yyyy", { locale: es })}</strong>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteWeekSchedules}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Barra de acción para pegar horario */}
      {copiedSchedule && (
        <Card className="p-4 border-2 border-primary bg-primary/5 relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Modo: Pegar Horario</h3>
              <p className="text-sm text-muted-foreground">
                {copiedSchedule.selectedCells.length > 0 
                  ? `${copiedSchedule.selectedCells.length} celda(s) seleccionada(s)`
                  : "Haz clic en cualquier celda del calendario para pegar el horario"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setCopiedSchedule(null)}
              >
                Cancelar
              </Button>
              {copiedSchedule.selectedCells.length > 0 && (
                <Button onClick={handleApplySchedule}>
                  Aplicar a {copiedSchedule.selectedCells.length} celda(s)
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
        <Card className="overflow-x-auto relative z-10">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-semibold w-32 sticky left-0 bg-card z-10">
                  Empleado
                </th>
                {weekDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const isHighlighted = highlightedDate === dateStr;
                  return (
                    <th 
                      key={day.toISOString()} 
                      className={cn(
                        "p-2 text-center font-semibold w-28 transition-all duration-300",
                        isHighlighted && "bg-primary/15 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                      )}
                    >
                      <div className="text-sm">{format(day, "EEE", { locale: es })}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {format(day, "d MMM", { locale: es })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 sticky left-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{employee.name}</div>
                        {employee.position && (
                          <div className="text-xs text-muted-foreground">{employee.position}</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setCalendarDialogOpen(true);
                        }}
                        title="Ver horario visual"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                  {weekDays.map((day) => {
                    const onVacation = isOnVacation(employee.id, day);
                    const daySchedules = getSchedulesForDay(employee.id, day);
                    const isInPasteMode = !!copiedSchedule;
                    const dateStr = format(day, "yyyy-MM-dd");
                    const isSelected = copiedSchedule?.selectedCells.some(
                      cell => cell.employeeId === employee.id && cell.date === dateStr
                    );

                    const isHighlighted = highlightedDate === dateStr;

                    return (
                      <td 
                        key={`${employee.id}-${day.toISOString()}`} 
                        className={cn(
                          "p-1 transition-all duration-300",
                          isHighlighted && "bg-primary/15 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        )}
                      >
                        <ScheduleCell
                          employeeId={employee.id}
                          date={day}
                          schedules={daySchedules}
                          onVacation={onVacation}
                          onUpdate={updateSchedule}
                          onDelete={deleteSchedule}
                          onCopy={handleCopySchedule}
                          onSelect={() => {
                            if (isInPasteMode && !onVacation) {
                              toggleCellSelection(employee.id, day);
                            }
                          }}
                          isInSelectionMode={isInPasteMode && !onVacation}
                          isSelected={isSelected || false}
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

      {/* Employee Weekly Calendar Dialog */}
      {selectedEmployee && (
        <EmployeeWeeklyCalendar
          open={calendarDialogOpen}
          onOpenChange={setCalendarDialogOpen}
          employee={selectedEmployee}
          schedules={schedules.filter(s => s.employee_id === selectedEmployee.id)}
          weekStart={currentWeekStart}
          businessId={businessId}
        />
      )}
    </div>
  );
};
