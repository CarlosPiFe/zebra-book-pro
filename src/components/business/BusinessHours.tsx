import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Plus, Trash2 } from "lucide-react";
import { TimePicker } from "@/components/ui/time-picker";
import { Checkbox } from "@/components/ui/checkbox";

interface BusinessHoursProps {
  businessId: string;
}

interface HourEntry {
  id: string;
  days: number[];
  start_time: string;
  end_time: string;
}

const DAYS = [
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
  { value: 0, label: "D" },
];

export function BusinessHours({ businessId }: BusinessHoursProps) {
  const [hours, setHours] = useState<HourEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  useEffect(() => {
    loadHours();
  }, [businessId]);

  const loadHours = async () => {
    try {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("business_id", businessId)
        .order("day_of_week");

      if (error) throw error;

      // Group by time ranges
      const grouped: { [key: string]: HourEntry } = {};
      data?.forEach((slot) => {
        const key = `${slot.start_time}-${slot.end_time}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: slot.id,
            days: [slot.day_of_week],
            start_time: slot.start_time,
            end_time: slot.end_time,
          };
        } else {
          grouped[key].days.push(slot.day_of_week);
        }
      });

      setHours(Object.values(grouped));
    } catch (error) {
      console.error("Error loading hours:", error);
      toast.error("Error al cargar los horarios");
    }
  };

  const handleAddHours = async () => {
    if (selectedDays.length === 0 || !startTime || !endTime) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const slots = selectedDays.map((day) => ({
        business_id: businessId,
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        slot_duration_minutes: 30,
      }));

      const { error } = await supabase.from("availability_slots").insert(slots);

      if (error) throw error;

      toast.success("Horario añadido correctamente");
      setSelectedDays([]);
      setStartTime("");
      setEndTime("");
      loadHours();
    } catch (error) {
      console.error("Error adding hours:", error);
      toast.error("Error al añadir el horario");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (entry: HourEntry) => {
    try {
      const { error } = await supabase
        .from("availability_slots")
        .delete()
        .eq("business_id", businessId)
        .eq("start_time", entry.start_time)
        .eq("end_time", entry.end_time)
        .in("day_of_week", entry.days);

      if (error) throw error;

      toast.success("Horario eliminado");
      loadHours();
    } catch (error) {
      console.error("Error deleting hours:", error);
      toast.error("Error al eliminar el horario");
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getDaysLabel = (days: number[]) => {
    const sortedDays = [...days].sort();
    return sortedDays.map((d) => DAYS.find((day) => day.value === d)?.label).join(", ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horario de Apertura
        </CardTitle>
        <CardDescription>
          Configura los horarios de tu negocio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Lista de horarios existentes */}
        <div className="space-y-2">
          <Label>Horarios Configurados</Label>
          {hours.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay horarios configurados</p>
          ) : (
            <div className="space-y-2">
              {hours.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{getDaysLabel(entry.days)}</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.start_time} - {entry.end_time}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEntry(entry)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulario para añadir nuevo horario */}
        <div className="space-y-4 pt-4 border-t">
          <Label>Añadir Nuevo Horario</Label>
          
          <div className="space-y-2">
            <Label className="text-sm">Días de la semana</Label>
            <div className="flex gap-2">
              {DAYS.map((day) => (
                <div key={day.value} className="flex items-center">
                  <Button
                    type="button"
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                    className="h-9 w-9 p-0"
                  >
                    {day.label}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Hora de apertura</Label>
              <TimePicker
                time={startTime}
                onTimeChange={setStartTime}
                placeholder="Seleccionar hora"
              />
            </div>

            <div className="space-y-2">
              <Label>Hora de cierre</Label>
              <TimePicker
                time={endTime}
                onTimeChange={setEndTime}
                placeholder="Seleccionar hora"
              />
            </div>
          </div>

          <Button
            onClick={handleAddHours}
            disabled={loading || selectedDays.length === 0 || !startTime || !endTime}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Añadir Horario
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
