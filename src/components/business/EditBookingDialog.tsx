import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { z } from "zod";
import { toMadridTime } from "@/lib/timezone";
import { format, parse, addMinutes } from "date-fns";
import { Info } from "lucide-react";

const bookingSchema = z.object({
  client_name: z.string().trim().min(1, "El nombre es requerido").max(100),
  client_email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  client_phone: z.string().trim().max(20).optional().or(z.literal("")),
  booking_date: z.date(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  party_size: z.number().min(1, "Mínimo 1 persona").max(50),
  notes: z.string().max(500).optional().or(z.literal("")),
});

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  status: string;
  table_id: string;
}

interface EditBookingDialogProps {
  booking: Booking;
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingUpdated: () => void;
}

interface Business {
  booking_slot_duration_minutes: number;
}

export function EditBookingDialog({ 
  booking, 
  businessId, 
  open, 
  onOpenChange, 
  onBookingUpdated 
}: EditBookingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [customEndTime, setCustomEndTime] = useState(true);
  const [clientName, setClientName] = useState(booking.client_name);
  const [clientEmail, setClientEmail] = useState(booking.client_email || "");
  const [clientPhone, setClientPhone] = useState(booking.client_phone || "");
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date(booking.booking_date));
  const [startTime, setStartTime] = useState(booking.start_time.substring(0, 5));
  const [endTime, setEndTime] = useState(booking.end_time.substring(0, 5));
  const [partySize, setPartySize] = useState(booking.party_size.toString());
  const [notes, setNotes] = useState(booking.notes || "");

  useEffect(() => {
    if (open) {
      setClientName(booking.client_name);
      setClientEmail(booking.client_email || "");
      setClientPhone(booking.client_phone || "");
      
      // Parsear la fecha en zona horaria de Madrid
      const bookingDateParsed = parse(booking.booking_date, "yyyy-MM-dd", new Date());
      setBookingDate(bookingDateParsed);
      
      setStartTime(booking.start_time.substring(0, 5));
      setEndTime(booking.end_time.substring(0, 5));
      setCustomEndTime(true); // Las reservas existentes tienen hora personalizada
      setPartySize(booking.party_size.toString());
      setNotes(booking.notes || "");

      // Load business slot duration
      const loadBusinessSettings = async () => {
        const { data, error } = await supabase
          .from("businesses")
          .select("booking_slot_duration_minutes")
          .eq("id", businessId)
          .single();

        if (!error && data) {
          setSlotDuration(data.booking_slot_duration_minutes);
        }
      };

      loadBusinessSettings();
    }
  }, [open, booking, businessId]);

  // Auto-calculate end time when start time changes (only if not custom)
  useEffect(() => {
    if (startTime && !customEndTime) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = addMinutes(startDate, slotDuration);
      const calculatedEndTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setEndTime(calculatedEndTime);
    }
  }, [startTime, slotDuration, customEndTime]);

  const findAvailableTable = async (
    date: string,
    startTime: string,
    endTime: string,
    partySize: number,
    excludeBookingId: string
  ): Promise<{ tableId: string | null; status: "reserved" | "pending" }> => {
    try {
      const { data: tables, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("max_capacity", { ascending: true });

      if (tablesError) throw tablesError;
      if (!tables || tables.length === 0) {
        return { tableId: null, status: "pending" };
      }

      // Using < and > (not <= and >=) so end time is exclusive - allows back-to-back bookings
      const { data: existingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("booking_date", date)
        .neq("status", "cancelled")
        .neq("id", excludeBookingId)
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (bookingsError) throw bookingsError;

      const occupiedTableIds = new Set(
        existingBookings?.map((b) => b.table_id) || []
      );

      const exactMatch = tables.find(
        (t) => t.max_capacity === partySize && !occupiedTableIds.has(t.id)
      );

      if (exactMatch) {
        return { tableId: exactMatch.id, status: "reserved" };
      }

      const availableTable = tables.find(
        (t) => t.max_capacity >= partySize && !occupiedTableIds.has(t.id)
      );

      if (availableTable) {
        return { tableId: availableTable.id, status: "reserved" };
      }

      return { tableId: null, status: "pending" };
    } catch (error) {
      console.error("Error finding available table:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookingDate) {
      toast.error("Selecciona una fecha");
      return;
    }

    try {
      setLoading(true);

      const formData = bookingSchema.parse({
        client_name: clientName,
        client_email: clientEmail || undefined,
        client_phone: clientPhone || undefined,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        party_size: parseInt(partySize),
        notes: notes || undefined,
      });

      // Convertir a zona horaria de Madrid antes de guardar
      const madridDate = toMadridTime(formData.booking_date);
      const dateString = format(madridDate, "yyyy-MM-dd");

      const { tableId, status } = await findAvailableTable(
        dateString,
        formData.start_time,
        formData.end_time,
        formData.party_size,
        booking.id
      );

      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          client_name: formData.client_name,
          client_email: formData.client_email || null,
          client_phone: formData.client_phone || null,
          booking_date: dateString,
          start_time: formData.start_time,
          end_time: formData.end_time,
          party_size: formData.party_size,
          notes: formData.notes || null,
          table_id: tableId,
          status: status,
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      if (status === "reserved") {
        toast.success("Reserva actualizada y mesa asignada");
      } else {
        toast.warning("Reserva actualizada como pendiente - sin mesas disponibles");
      }

      onOpenChange(false);
      onBookingUpdated();
    } catch (error: any) {
      console.error("Error updating booking:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Error al actualizar la reserva");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de eliminar esta reserva?")) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Reserva eliminada");
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Error al eliminar la reserva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Reserva</DialogTitle>
            <DialogDescription>
              Modifica los detalles de la reserva. El sistema reasignará la mesa según disponibilidad.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">Nombre del cliente *</Label>
                <Input
                  id="client_name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="party_size">Número de personas *</Label>
                <Input
                  id="party_size"
                  type="number"
                  min="1"
                  max="50"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client_email">Email</Label>
                <Input
                  id="client_email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="client_phone">Teléfono</Label>
                <Input
                  id="client_phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de reserva *</Label>
              <DatePicker
                date={bookingDate}
                onDateChange={setBookingDate}
                placeholder="Seleccionar fecha"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Hora de inicio *</Label>
                <TimePicker
                  time={startTime}
                  onTimeChange={setStartTime}
                  placeholder="14:00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time" className="flex items-center gap-2">
                  Hora de fin {!customEndTime && "(automática)"}
                </Label>
                <TimePicker
                  time={endTime}
                  onTimeChange={(time) => {
                    setEndTime(time);
                    setCustomEndTime(true);
                  }}
                  placeholder="Calculada automáticamente"
                />
                {!customEndTime && startTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Duración: {slotDuration} minutos (configurable en Ajustes)
                  </p>
                )}
                {customEndTime && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCustomEndTime(false)}
                    className="h-6 text-xs"
                  >
                    Usar duración automática
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Alergias, preferencias, ocasión especial..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Eliminar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
