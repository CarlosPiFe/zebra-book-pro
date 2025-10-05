import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Trash2 } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";

interface ScheduleEntry {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface EmployeeScheduleProps {
  employeeId: string;
  employeeName: string;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function EmployeeSchedule({ employeeId, employeeName }: EmployeeScheduleProps) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endTime, setEndTime] = useState<string>("17:00");

  useEffect(() => {
    loadSchedules();
  }, [employeeId]);

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_schedules")
        .select("*")
        .eq("employee_id", employeeId)
        .order("day_of_week");

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error loading schedules:", error);
      toast.error("Error al cargar horarios");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddSchedule = async () => {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }

    try {
      const entries = selectedDays.map(day => ({
        employee_id: employeeId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      }));

      const { error } = await supabase
        .from("employee_schedules")
        .insert(entries);

      if (error) throw error;

      toast.success("Horarios añadidos correctamente");
      setIsDialogOpen(false);
      setSelectedDays([]);
      loadSchedules();
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast.error("Error al añadir horarios");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from("employee_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) throw error;

      toast.success("Horario eliminado");
      loadSchedules();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Error al eliminar horario");
    }
  };

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const key = `${schedule.start_time}-${schedule.end_time}`;
    if (!acc[key]) {
      acc[key] = {
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        days: [],
      };
    }
    acc[key].days.push({ day: schedule.day_of_week, id: schedule.id });
    return acc;
  }, {} as Record<string, { startTime: string; endTime: string; days: { day: number; id: string }[] }>);

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horario de {employeeName}
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Añadir Horario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Horario para {employeeName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Días de la semana</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {DAYS.map((day, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant={selectedDays.includes(index) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleDay(index)}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <TimePicker time={startTime} onTimeChange={setStartTime} />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <TimePicker time={endTime} onTimeChange={setEndTime} />
                  </div>
                </div>

                <Button onClick={handleAddSchedule} className="w-full">
                  Guardar Horario
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(groupedSchedules).length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay horarios configurados</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedSchedules).map(([key, schedule]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">
                    {schedule.startTime} - {schedule.endTime}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {schedule.days.map(d => DAYS[d.day]).join(", ")}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => schedule.days.forEach(d => handleDeleteSchedule(d.id))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
