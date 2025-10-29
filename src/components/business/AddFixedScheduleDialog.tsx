import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Clock, Check, ChevronsUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, isAfter, isBefore, startOfDay } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";

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
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 90));
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

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
      setStartTime("09:00");
      setEndTime("17:00");
      setStartDate(new Date());
      setEndDate(addDays(new Date(), 90));
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

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      toast.error("Selecciona al menos un empleado");
      return;
    }

    if (!startTime || !endTime) {
      toast.error("Completa las horas de inicio y fin");
      return;
    }

    if (startTime >= endTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Selecciona las fechas de inicio y fin");
      return;
    }

    if (isAfter(startDate, endDate)) {
      toast.error("La fecha de inicio debe ser anterior o igual a la fecha de fin");
      return;
    }

    setLoading(true);
    try {
      // Process each selected employee
      for (const employeeId of selectedEmployeeIds) {
        // First, delete existing regular schedules for these days
        const { error: deleteRegularError } = await supabase
          .from("employee_schedules")
          .delete()
          .eq("employee_id", employeeId)
          .in("day_of_week", selectedDays);

        if (deleteRegularError) throw deleteRegularError;

        // Insert new regular schedules (applies to all weeks)
        const regularSchedules = selectedDays.map((dayOfWeek) => ({
          employee_id: employeeId,
          day_of_week: dayOfWeek,
          start_time: startTime,
          end_time: endTime,
        }));

        const { error: insertRegularError } = await supabase
          .from("employee_schedules")
          .insert(regularSchedules);

        if (insertRegularError) throw insertRegularError;

        // Generate weekly schedules within the date range
        const weeklySchedulesToCreate = [];
        const rangeStart = startOfDay(startDate);
        const rangeEnd = startOfDay(endDate);
        
        // Iterate through each day in the range
        let currentDate = new Date(rangeStart);
        while (!isAfter(currentDate, rangeEnd)) {
          const currentDayOfWeek = currentDate.getDay();
          
          // If this day of week is selected, add a schedule
          if (selectedDays.includes(currentDayOfWeek)) {
            weeklySchedulesToCreate.push({
              employee_id: employeeId,
              date: format(currentDate, "yyyy-MM-dd"),
              is_day_off: false,
              start_time: startTime,
              end_time: endTime,
              slot_order: 1,
            });
          }
          
          // Move to next day
          currentDate = addDays(currentDate, 1);
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

      toast.success(
        `Horario repetido creado para ${selectedEmployeeIds.length} empleado(s) desde ${format(startDate, "dd/MM/yyyy")} hasta ${format(endDate, "dd/MM/yyyy")}`
      );
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

          {/* Date range selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="Fecha de inicio"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de fin</Label>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="Fecha de fin"
                disabled={(date) => startDate ? isBefore(date, startDate) : false}
              />
            </div>
          </div>

          {/* Time selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Hora de inicio</Label>
              <input
                id="start-time"
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Hora de fin</Label>
              <input
                id="end-time"
                type="time"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
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
