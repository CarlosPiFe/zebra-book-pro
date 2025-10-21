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
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

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
  currentWeekStart,
  onScheduleAdded,
}: AddFixedScheduleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

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
      setSelectedEmployeeId("");
    }
  };

  const toggleDay = (dayValue: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue]
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    if (!selectedEmployeeId) {
      toast.error("Selecciona un empleado");
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

    setLoading(true);
    try {
      // First, delete existing regular schedules for these days
      const { error: deleteRegularError } = await supabase
        .from("employee_schedules")
        .delete()
        .eq("employee_id", selectedEmployeeId)
        .in("day_of_week", selectedDays);

      if (deleteRegularError) throw deleteRegularError;

      // Insert new regular schedules (applies to all weeks)
      const regularSchedules = selectedDays.map((dayOfWeek) => ({
        employee_id: selectedEmployeeId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      }));

      const { error: insertRegularError } = await supabase
        .from("employee_schedules")
        .insert(regularSchedules);

      if (insertRegularError) throw insertRegularError;

      // Also populate the next 52 weeks in employee_weekly_schedules
      const weeklySchedulesToCreate = [];
      const today = new Date();
      
      // For each of the next 52 weeks
      for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
        for (const dayOfWeek of selectedDays) {
          // Calculate the actual date
          // dayOfWeek: 0=Sunday, 1=Monday, etc.
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + (weekOffset * 7));
          
          // Adjust to the correct day of week
          const currentDayOfWeek = targetDate.getDay();
          const daysToAdd = (dayOfWeek - currentDayOfWeek + 7) % 7;
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          
          weeklySchedulesToCreate.push({
            employee_id: selectedEmployeeId,
            date: format(targetDate, "yyyy-MM-dd"),
            is_day_off: false,
            start_time: startTime,
            end_time: endTime,
            slot_order: 1,
          });
        }
      }

      // Delete any existing schedules for these dates first
      if (weeklySchedulesToCreate.length > 0) {
        const datesToDelete = weeklySchedulesToCreate.map(s => s.date);
        
        const { error: deleteWeeklyError } = await supabase
          .from("employee_weekly_schedules")
          .delete()
          .eq("employee_id", selectedEmployeeId)
          .in("date", datesToDelete);

        if (deleteWeeklyError) throw deleteWeeklyError;

        // Insert all the weekly schedules
        const { error: insertWeeklyError } = await supabase
          .from("employee_weekly_schedules")
          .insert(weeklySchedulesToCreate);

        if (insertWeeklyError) throw insertWeeklyError;
      }

      toast.success(
        `Horario fijo creado para ${selectedDays.length} día(s) - se aplicará todas las semanas`
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
          Añadir horario fijo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir horario fijo</DialogTitle>
          <DialogDescription>
            Crea un horario recurrente para varios días de la semana. Este horario se aplicará 
            automáticamente todas las semanas. Los horarios fijos existentes para estos días serán reemplazados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee selection */}
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado</Label>
            <select
              id="employee"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
            >
              <option value="">Selecciona un empleado</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
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
