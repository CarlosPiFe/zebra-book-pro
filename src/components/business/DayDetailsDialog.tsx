import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Users, CalendarDays, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_time: string | null;
  event_date: string;
  business_id: string;
  color: string;
  created_at: string;
  updated_at: string;
}

const EVENT_COLORS = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Naranja", value: "#f97316" },
  { name: "Púrpura", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Amarillo", value: "#eab308" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Turquesa", value: "#06b6d4" },
];

interface DayDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date;
  businessId: string;
  isClosed: boolean;
}

export function DayDetailsDialog({ open, onOpenChange, date, businessId, isClosed }: DayDetailsDialogProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    description: "",
    time: "",
    color: EVENT_COLORS[0].value,
  });

  useEffect(() => {
    if (open) {
      loadEvents();
    }
  }, [open, date, businessId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const dateString = format(date, "yyyy-MM-dd");
      const { data, error } = await (supabase as any)
        .from("calendar_events")
        .select("*")
        .eq("business_id", businessId)
        .eq("event_date", dateString)
        .order("event_time", { ascending: true });

      if (error) throw error;
      setEvents((data || []) as CalendarEvent[]);
    } catch (error) {
      console.error("Error loading events:", error);
      toast.error("Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    if (isClosed) {
      toast.error("No se pueden añadir eventos en días cerrados");
      return;
    }

    try {
      const dateString = format(date, "yyyy-MM-dd");
      const { error } = await (supabase as any).from("calendar_events").insert([{
        business_id: businessId,
        event_date: dateString,
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_time: newEvent.time || null,
        color: newEvent.color,
      }]);

      if (error) throw error;

      toast.success("Evento añadido");
      setNewEvent({ title: "", description: "", time: "", color: EVENT_COLORS[0].value });
      loadEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Error al añadir evento");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("calendar_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      toast.success("Evento eliminado");
      loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Error al eliminar evento");
    }
  };

  const handleViewSchedules = () => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    const highlightDateStr = format(date, "yyyy-MM-dd");
    navigate(`/business/${businessId}/manage?view=schedules&weekStart=${weekStartStr}&highlightDate=${highlightDateStr}`);
    onOpenChange(false);
  };

  const handleViewBookings = () => {
    const dateStr = format(date, "yyyy-MM-dd");
    navigate(`/business/${businessId}/manage?view=bookings&date=${dateStr}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </DialogTitle>
          <DialogDescription>
            {isClosed ? (
              <span className="text-destructive font-medium">Día cerrado - Solo visualización</span>
            ) : (
              "Gestiona eventos y accede a información del día"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Existing Events */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground">Eventos del día</h3>
            {loading ? (
              <div className="h-20 bg-muted rounded animate-pulse" />
            ) : events.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground text-sm">
                  No hay eventos para este día
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <Card key={event.id} className="border-l-4" style={{ borderLeftColor: event.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: event.color }}
                            />
                            <span className="font-semibold">{event.title}</span>
                            {event.event_time && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.event_time}
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground">{event.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEvent(event.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Add New Event */}
          {!isClosed && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm text-muted-foreground">Añadir nuevo evento</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Reunión de equipo"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    placeholder="Detalles adicionales del evento..."
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora (opcional)</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color del evento</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {EVENT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewEvent({ ...newEvent, color: color.value })}
                        className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${
                          newEvent.color === color.value 
                            ? "border-foreground scale-105" 
                            : "border-border hover:border-foreground/50"
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {newEvent.color === color.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleAddEvent} className="w-full">
                  Añadir Evento
                </Button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Acciones rápidas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleViewSchedules}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm">Ver horarios de empleados de esta semana</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleViewBookings}
                className="h-auto py-4 flex flex-col items-center gap-2"
              >
                <Users className="h-5 w-5" />
                <span className="text-sm">Ver reservas de este día</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
