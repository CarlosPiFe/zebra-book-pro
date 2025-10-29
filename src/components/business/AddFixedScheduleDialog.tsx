import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { TimePicker } from "@/components/ui/time-picker";
import { Clock, Check, ChevronsUpDown, CalendarIcon, Plus, Trash2, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, isAfter, startOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddFixedScheduleDialogProps {
  businessId: string;
  currentWeekStart: Date;
  onScheduleAdded: () => void;
}

// Days of the week matching the business hours format (0=Domingo, 1=Lunes, etc.)
const DAYS_OF_WEEK = [
  { value: 1, label: "Lunes", short: "L" },
  { value: 2, label: "Martes", short: "M" },
  { value: 3, label: "Miércoles", short: "X" },
  { value: 4, label: "Jueves", short: "J" },
  { value: 5, label: "Viernes", short: "V" },
  { value: 6, label: "Sábado", short: "S" },
  { value: 0, label: "Domingo", short: "D" },
];

export const AddFixedScheduleDialog = ({
  businessId,
  onScheduleAdded,
}: AddFixedScheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  // Time slots state
  const [timeSlots, setTimeSlots] = useState<Array<{ id: number; start: string; end: string }>>([
    { id: 1, start: "09:00", end: "17:00" }
  ]);
  const [nextSlotId, setNextSlotId] = useState(2);
  
  // Date selection state
  const [dateSelectionMode, setDateSelectionMode] = useState<"range" | "multiple">("range");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 90),
  });
  const [multipleDates, setMultipleDates] = useState<Date[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  // Conflict warnings
  const [scheduleConflict, setScheduleConflict] = useState<{
    hasConflict: boolean;
    employeeNames: string[];
  }>({ hasConflict: false, employeeNames: [] });
  
  const [vacationConflict, setVacationConflict] = useState<{
    hasConflict: boolean;
    details: Array<{ employeeName: string; vacationStart: string; vacationEnd: string }>;
  }>({ hasConflict: false, details: [] });

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("id, name")
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

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadEmployees();
      // Reset form
      setSelectedDays([]);
      setTimeSlots([{ id: 1, start: "09:00", end: "17:00" }]);
      setNextSlotId(2);
      setDateSelectionMode("range");
      setDateRange({ from: new Date(), to: addDays(new Date(), 90) });
      setMultipleDates([]);
      setSelectedEmployeeIds([]);
    }
  };

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const addTimeSlot = () => {
    setTimeSlots([...timeSlots, { id: nextSlotId, start: "", end: "" }]);
    setNextSlotId(nextSlotId + 1);
  };

  const removeTimeSlot = (id: number) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    }
  };

  const updateTimeSlot = (id: number, field: "start" | "end", value: string) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
  };

  // Check for conflicts whenever relevant data changes
  useEffect(() => {
    const checkConflicts = async () => {
      if (selectedEmployeeIds.length === 0 || selectedDays.length === 0) {
        setScheduleConflict({ hasConflict: false, employeeNames: [] });
        setVacationConflict({ hasConflict: false, details: [] });
        return;
      }

      // Determine date range to check
      let checkStartDate: Date | null = null;
      let checkEndDate: Date | null = null;

      if (dateSelectionMode === "range" && dateRange?.from && dateRange?.to) {
        checkStartDate = dateRange.from;
        checkEndDate = dateRange.to;
      } else if (dateSelectionMode === "multiple" && multipleDates.length > 0) {
        const sortedDates = [...multipleDates].sort((a, b) => a.getTime() - b.getTime());
        checkStartDate = sortedDates[0]!;
        checkEndDate = sortedDates[sortedDates.length - 1]!;
      }

      if (!checkStartDate || !checkEndDate) {
        setScheduleConflict({ hasConflict: false, employeeNames: [] });
        setVacationConflict({ hasConflict: false, details: [] });
        return;
      }

      try {
        // Check for existing schedules
        const { data: existingSchedules, error: schedulesError } = await supabase
          .from("employee_weekly_schedules")
          .select("employee_id, date, waiters!inner(name)")
          .in("employee_id", selectedEmployeeIds)
          .gte("date", format(checkStartDate, "yyyy-MM-dd"))
          .lte("date", format(checkEndDate, "yyyy-MM-dd"));

        if (schedulesError) throw schedulesError;

        // Filter schedules that match selected days of week
        const conflictingEmployees = new Set<string>();
        existingSchedules?.forEach((schedule: any) => {
          const scheduleDate = new Date(schedule.date);
          const dayOfWeek = scheduleDate.getDay();
          if (selectedDays.includes(dayOfWeek)) {
            conflictingEmployees.add(schedule.waiters.name);
          }
        });

        setScheduleConflict({
          hasConflict: conflictingEmployees.size > 0,
          employeeNames: Array.from(conflictingEmployees),
        });

        // Check for vacations
        const { data: vacations, error: vacationsError } = await supabase
          .from("employee_vacations")
          .select("*, waiters!inner(name)")
          .in("employee_id", selectedEmployeeIds)
          .lte("start_date", format(checkEndDate, "yyyy-MM-dd"))
          .gte("end_date", format(checkStartDate, "yyyy-MM-dd"));

        if (vacationsError) throw vacationsError;

        const vacationConflicts: Array<{ employeeName: string; vacationStart: string; vacationEnd: string }> = [];
        
        vacations?.forEach((vacation: any) => {
          const vacationStart = new Date(vacation.start_date);
          const vacationEnd = new Date(vacation.end_date);

          // Check if any selected day falls within vacation
          let hasVacationConflict = false;

          if (dateSelectionMode === "range" && dateRange?.from && dateRange?.to) {
            let currentDate = new Date(Math.max(vacationStart.getTime(), dateRange.from.getTime()));
            const rangeEnd = new Date(Math.min(vacationEnd.getTime(), dateRange.to.getTime()));

            while (!isAfter(currentDate, rangeEnd)) {
              const dayOfWeek = currentDate.getDay();
              if (selectedDays.includes(dayOfWeek)) {
                hasVacationConflict = true;
                break;
              }
              currentDate = addDays(currentDate, 1);
            }
          } else if (dateSelectionMode === "multiple") {
            hasVacationConflict = multipleDates.some((selectedDate) => {
              const dayOfWeek = selectedDate.getDay();
              return (
                selectedDays.includes(dayOfWeek) &&
                selectedDate >= vacationStart &&
                selectedDate <= vacationEnd
              );
            });
          }

          if (hasVacationConflict) {
            vacationConflicts.push({
              employeeName: vacation.waiters.name,
              vacationStart: format(vacationStart, "dd/MM/yyyy"),
              vacationEnd: format(vacationEnd, "dd/MM/yyyy"),
            });
          }
        });

        setVacationConflict({
          hasConflict: vacationConflicts.length > 0,
          details: vacationConflicts,
        });
      } catch (error) {
        console.error("Error checking conflicts:", error);
      }
    };

    checkConflicts();
  }, [selectedEmployeeIds, selectedDays, dateSelectionMode, dateRange, multipleDates]);

  const toggleDateSelectionMode = (checked: boolean) => {
    if (checked) {
      // Switch to multiple mode
      setDateSelectionMode("multiple");
      setDateRange(undefined);
      setMultipleDates([]);
    } else {
      // Switch to range mode
      setDateSelectionMode("range");
      setMultipleDates([]);
      setDateRange({ from: new Date(), to: addDays(new Date(), 90) });
    }
  };

  const getDateSelectionDisplay = () => {
    if (dateSelectionMode === "range") {
      if (dateRange?.from && dateRange?.to) {
        return `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`;
      } else if (dateRange?.from) {
        return format(dateRange.from, "dd MMM yyyy");
      }
      return "Selecciona un rango de fechas";
    } else {
      if (multipleDates.length === 0) {
        return "Selecciona días sueltos";
      } else if (multipleDates.length <= 3) {
        return multipleDates.map(d => format(d, "dd MMM")).join(", ");
      } else {
        return `${multipleDates.length} días seleccionados`;
      }
    }
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error("Selecciona al menos un empleado");
      return;
    }

    // Validate time slots
    const invalidSlots = timeSlots.filter(slot => !slot.start || !slot.end);
    if (invalidSlots.length > 0) {
      toast.error("Completa todos los tramos horarios");
      return;
    }

    // Validate date selection based on mode
    if (dateSelectionMode === "range") {
      if (!dateRange?.from || !dateRange?.to) {
        toast.error("Selecciona un rango de fechas válido");
        return;
      }
      if (isAfter(dateRange.from, dateRange.to)) {
        toast.error("La fecha de inicio debe ser anterior o igual a la fecha de fin");
        return;
      }
    } else {
      if (multipleDates.length === 0) {
        toast.error("Selecciona al menos un día");
        return;
      }
    }

    setLoading(true);
    try {
      // Process each selected employee
      for (const employeeId of selectedEmployeeIds) {
        // Get employee vacations to filter out vacation dates
        const { data: employeeVacations, error: vacationsError } = await supabase
          .from("employee_vacations")
          .select("start_date, end_date")
          .eq("employee_id", employeeId);

        if (vacationsError) throw vacationsError;

        // Helper function to check if a date is within vacation
        const isDateInVacation = (dateToCheck: Date): boolean => {
          return employeeVacations?.some((vacation) => {
            const vacationStart = new Date(vacation.start_date);
            const vacationEnd = new Date(vacation.end_date);
            return dateToCheck >= vacationStart && dateToCheck <= vacationEnd;
          }) || false;
        };

        // First, delete existing regular schedules for these days
        const { error: deleteRegularError } = await supabase
          .from("employee_schedules")
          .delete()
          .eq("employee_id", employeeId)
          .in("day_of_week", selectedDays);

        if (deleteRegularError) throw deleteRegularError;

        // Insert new regular schedules (applies to all weeks) - one per time slot
        const regularSchedules: any[] = [];
        selectedDays.forEach((dayOfWeek) => {
          timeSlots.forEach((slot) => {
            regularSchedules.push({
              employee_id: employeeId,
              day_of_week: dayOfWeek,
              start_time: slot.start,
              end_time: slot.end,
            });
          });
        });

        const { error: insertRegularError } = await supabase
          .from("employee_schedules")
          .insert(regularSchedules);

        if (insertRegularError) throw insertRegularError;

        // Generate weekly schedules based on selection mode
        const weeklySchedulesToCreate: Array<{
          employee_id: string;
          date: string;
          is_day_off: boolean;
          start_time: string;
          end_time: string;
          slot_order: number;
        }> = [];
        
        if (dateSelectionMode === "range" && dateRange?.from && dateRange?.to) {
          // Range mode: iterate through each day in the range
          const rangeStart = startOfDay(dateRange.from);
          const rangeEnd = startOfDay(dateRange.to);
          
          let currentDate = new Date(rangeStart);
          while (!isAfter(currentDate, rangeEnd)) {
            const currentDayOfWeek = currentDate.getDay();
            
            // If this day of week is selected and NOT in vacation, add schedules for each time slot
            if (selectedDays.includes(currentDayOfWeek) && !isDateInVacation(currentDate)) {
              timeSlots.forEach((slot, slotIndex) => {
                weeklySchedulesToCreate.push({
                  employee_id: employeeId,
                  date: format(currentDate, "yyyy-MM-dd"),
                  is_day_off: false,
                  start_time: slot.start,
                  end_time: slot.end,
                  slot_order: slotIndex + 1,
                });
              });
            }
            
            // Move to next day
            currentDate = addDays(currentDate, 1);
          }
        } else if (dateSelectionMode === "multiple") {
          // Multiple mode: only create schedules for selected dates
          multipleDates.forEach(selectedDate => {
            const currentDayOfWeek = selectedDate.getDay();
            
            // If this day of week is selected and NOT in vacation, add schedules for each time slot
            if (selectedDays.includes(currentDayOfWeek) && !isDateInVacation(selectedDate)) {
              timeSlots.forEach((slot, slotIndex) => {
                weeklySchedulesToCreate.push({
                  employee_id: employeeId,
                  date: format(selectedDate, "yyyy-MM-dd"),
                  is_day_off: false,
                  start_time: slot.start,
                  end_time: slot.end,
                  slot_order: slotIndex + 1,
                });
              });
            }
          });
        }

        // Delete any existing schedules for these dates first
        if (weeklySchedulesToCreate.length > 0) {
          const datesToDelete = weeklySchedulesToCreate.map(s => s.date);
          
          const { error: deleteWeeklyError } = await supabase
            .from("employee_weekly_schedules")
            .delete()
            .eq("employee_id", employeeId)
            .in("date", datesToDelete);

          if (deleteWeeklyError) throw deleteWeeklyError;

          // Insert all the weekly schedules
          const { error: insertWeeklyError } = await supabase
            .from("employee_weekly_schedules")
            .insert(weeklySchedulesToCreate);

          if (insertWeeklyError) throw insertWeeklyError;
        }
      }

      const successMessage = dateSelectionMode === "range" && dateRange?.from && dateRange?.to
        ? `Horario repetido creado para ${selectedEmployeeIds.length} empleado(s) desde ${format(dateRange.from, "dd/MM/yyyy")} hasta ${format(dateRange.to, "dd/MM/yyyy")}`
        : `Horario creado para ${selectedEmployeeIds.length} empleado(s) en ${multipleDates.length} día(s) seleccionado(s)`;
      
      toast.success(successMessage);
      setOpen(false);
      onScheduleAdded();
    } catch (error) {
      console.error("Error creating fixed schedule:", error);
      toast.error("Error al crear horario fijo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" size="sm">
          <Clock className="w-4 h-4" />
          Añadir horario repetido
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir horario repetido</DialogTitle>
          <DialogDescription>
            Crea un horario recurrente para varios días de la semana dentro de un rango de fechas específico. 
            Los horarios existentes para estos días y fechas serán reemplazados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee selection */}
          <div className="space-y-2">
            <Label>Empleados</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full h-10 justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <span className="line-clamp-1 text-left">
                    {selectedEmployeeIds.length === 0
                      ? "Selecciona empleados..."
                      : `${selectedEmployeeIds.length} empleado(s) seleccionado(s)`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[999]" align="start">
                <Command className="rounded-md border bg-popover">
                  <CommandInput placeholder="Buscar empleado..." className="h-10" />
                  <CommandEmpty>No se encontró empleado.</CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {employees.map((employee) => (
                      <CommandItem
                        key={employee.id}
                        onSelect={() => toggleEmployee(employee.id)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedEmployeeIds.includes(employee.id)}
                          onCheckedChange={() => toggleEmployee(employee.id)}
                          className="pointer-events-none"
                        />
                        <span className="flex-1">{employee.name}</span>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4 shrink-0",
                            selectedEmployeeIds.includes(employee.id)
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Days selection */}
          <div className="space-y-2">
            <Label>Días de la semana</Label>
            <div className="flex gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={selectedDays.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day.value)}
                  className="h-9 w-9 p-0"
                >
                  {day.short}
                </Button>
              ))}
            </div>
          </div>

          {/* Date selection */}
          <div className="space-y-2">
            <Label>Fechas</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-auto min-h-10 px-3 py-2",
                    (!dateRange?.from && multipleDates.length === 0) && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="line-clamp-2">{getDateSelectionDisplay()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="multiple-mode"
                      checked={dateSelectionMode === "multiple"}
                      onCheckedChange={toggleDateSelectionMode}
                    />
                    <label
                      htmlFor="multiple-mode"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Seleccionar días sueltos
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dateSelectionMode === "range"
                      ? "Selecciona un rango de fechas (inicio y fin)"
                      : "Haz clic en días individuales para seleccionarlos"}
                  </p>
                </div>
                {dateSelectionMode === "range" ? (
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                ) : (
                  <Calendar
                    mode="multiple"
                    selected={multipleDates}
                    onSelect={(dates) => setMultipleDates(dates || [])}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Time slots selection */}
          <div className="space-y-4">
            <Label>Tramos horarios</Label>
            {timeSlots.map((slot, index) => (
              <div key={slot.id} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm">Tramo {index + 1}</h4>
                  {timeSlots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeSlot(slot.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`start-time-${slot.id}`}>Hora de inicio</Label>
                    <TimePicker
                      time={slot.start}
                      onTimeChange={(value) => updateTimeSlot(slot.id, "start", value)}
                      allowClear
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`end-time-${slot.id}`}>Hora de fin</Label>
                    <TimePicker
                      time={slot.end}
                      onTimeChange={(value) => updateTimeSlot(slot.id, "end", value)}
                      allowClear
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addTimeSlot}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir tramo
            </Button>
          </div>

          {/* Conflict warnings */}
          {scheduleConflict.hasConflict && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencia:</strong> En las fechas seleccionadas ya hay horarios para{" "}
                {scheduleConflict.employeeNames.length === 1 ? (
                  <>el empleado <strong>{scheduleConflict.employeeNames[0]}</strong></>
                ) : scheduleConflict.employeeNames.length === selectedEmployeeIds.length ? (
                  <>todos los empleados seleccionados</>
                ) : (
                  <>algunos empleados: <strong>{scheduleConflict.employeeNames.join(", ")}</strong></>
                )}
                . Si continúas, los horarios nuevos se sobreescribirán sobre los existentes.
              </AlertDescription>
            </Alert>
          )}

          {vacationConflict.hasConflict && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Advertencia:</strong> Hay vacaciones programadas que coinciden con las fechas seleccionadas:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {vacationConflict.details.map((detail, index) => (
                    <li key={index}>
                      <strong>{detail.employeeName}</strong>: {detail.vacationStart} - {detail.vacationEnd}
                    </li>
                  ))}
                </ul>
                Las vacaciones prevalecerán y no se crearán horarios en esos días.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Guardando..." : "Guardar horario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
