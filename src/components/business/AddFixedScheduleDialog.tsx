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

// Days of the week matching the business hours format
const DAYS_OF_WEEK = [
  { value: 0, label: "Lunes", short: "L" },
  { value: 1, label: "Martes", short: "M" },
  { value: 2, label: "Miércoles", short: "X" },
  { value: 3, label: "Jueves", short: "J" },
  { value: 4, label: "Viernes", short: "V" },
  { value: 5, label: "Sábado", short: "S" },
  { value: 6, label: "Domingo", short: "D" },
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
      // Get the dates for the selected days in the current week
      const datesToInsert = selectedDays.map((dayOffset) => {
        const date = addDays(currentWeekStart, dayOffset);
        return format(date, "yyyy-MM-dd");
      });

      // First, check if there are existing schedules for these dates
      const { data: existingSchedules, error: checkError } = await supabase
        .from("employee_weekly_schedules")
        .select("id, date")
        .eq("employee_id", selectedEmployeeId)
        .in("date", datesToInsert);

      if (checkError) throw checkError;

      // Delete existing schedules if any
      if (existingSchedules && existingSchedules.length > 0) {
        const { error: deleteError } = await supabase
          .from("employee_weekly_schedules")
          .delete()
          .in(
            "id",
            existingSchedules.map((s) => s.id)
          );

        if (deleteError) throw deleteError;
      }

      // Insert new schedules
      const schedulesToInsert = datesToInsert.map((date) => ({
        employee_id: selectedEmployeeId,
        date,
        is_day_off: false,
        start_time: startTime,
        end_time: endTime,
        slot_order: 1,
      }));

      const { error: insertError } = await supabase
        .from("employee_weekly_schedules")
        .insert(schedulesToInsert);

      if (insertError) throw insertError;

      toast.success(
        `Horario fijo creado para ${selectedDays.length} día(s)`
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
            Crea un horario para varios días a la vez. Los horarios existentes
            serán reemplazados.
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
