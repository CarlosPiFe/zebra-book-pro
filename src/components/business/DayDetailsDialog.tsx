import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, Utensils, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { es } from "date-fns/locale";

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  businessId: string;
  isClosed: boolean;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_time: string | null;
}

export function DayDetailsDialog({
  open,
  onOpenChange,
  selectedDate,
  businessId,
  isClosed,
}: DayDetailsDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    time: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedDate && open) {
      loadEvents();
    }
  }, [selectedDate, open]);

  const loadEvents = async () => {
    if (!selectedDate) return;

    try {
      const dateString = selectedDate.toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, description, event_time")
        .eq("business_id", businessId)
        .eq("event_date", dateString)
        .order("event_time", { ascending: true, nullsFirst: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error loading events:", error);
    }
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title.trim()) {
      toast({
        title: "Error",
        description: "El título del evento es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dateString = selectedDate.toISOString().split("T")[0];
      const { error } = await supabase.from("calendar_events").insert({
        business_id: businessId,
        event_date: dateString,
        event_time: newEvent.time || null,
        title: newEvent.title,
        description: newEvent.description || null,
      });

      if (error) throw error;

      toast({
        title: "Evento añadido",
        description: "El evento se ha guardado correctamente",
      });

      setNewEvent({ title: "", description: "", time: "" });
      loadEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Error",
        description: "No se pudo añadir el evento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Evento eliminado",
        description: "El evento se ha eliminado correctamente",
      });

      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el evento",
        variant: "destructive",
      });
    }
  };

  const handleViewEmployeeSchedules = () => {
    if (!selectedDate) return;

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const dateParam = selectedDate.toISOString().split("T")[0];

    navigate(
      `/business/${businessId}/manage?view=employees&tab=schedule&weekStart=${weekStart.toISOString()}&weekEnd=${weekEnd.toISOString()}&highlightDate=${dateParam}`
    );
    onOpenChange(false);
  };

  const handleViewBookings = () => {
    if (!selectedDate) return;

    const dateString = selectedDate.toISOString().split("T")[0];
    navigate(`/business/${businessId}/manage?view=bookings&date=${dateString}`);
    onOpenChange(false);
  };

  if (!selectedDate) return null;

  const formattedDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: es,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {formattedDate}
          </DialogTitle>
          <DialogDescription>
            {isClosed
              ? "Este día el local está cerrado. Puedes ver eventos pero no añadir nuevos."
              : "Gestiona eventos, horarios y reservas para este día"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Event Form */}
          {!isClosed && (
            <div className="space-y-4 p-4 border rounded-lg bg-accent/5">
              <h3 className="font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Añadir Evento o Nota
              </h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="event-title">Título del evento*</Label>
                  <Input
                    id="event-title"
                    placeholder="Ej: Reunión de equipo"
                    value={newEvent.title}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, title: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="event-time">Hora (opcional)</Label>
                  <Input
                    id="event-time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, time: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="event-description">
                    Descripción (opcional)
                  </Label>
                  <Textarea
                    id="event-description"
                    placeholder="Detalles adicionales del evento..."
                    value={newEvent.description}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAddEvent}
                  disabled={loading || !newEvent.title.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Evento
                </Button>
              </div>
            </div>
          )}

          {/* Existing Events */}
          {events.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">
                Eventos de este día ({events.length})
              </h3>
              {events.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border rounded-lg flex items-start justify-between gap-3 bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {event.event_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {event.event_time.slice(0, 5)}
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium">{event.title}</h4>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEvent(event.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold">Acciones Rápidas</h3>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleViewEmployeeSchedules}
            >
              <Users className="h-4 w-4 mr-2" />
              Ver horarios de empleados de esta semana
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleViewBookings}
            >
              <Utensils className="h-4 w-4 mr-2" />
              Ver reservas de este día
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
