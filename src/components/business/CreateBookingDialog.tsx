import { useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Plus } from "lucide-react";
import { z } from "zod";

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

interface CreateBookingDialogProps {
  businessId: string;
  onBookingCreated: () => void;
}

export function CreateBookingDialog({ businessId, onBookingCreated }: CreateBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setBookingDate(new Date());
    setStartTime("");
    setEndTime("");
    setPartySize("2");
    setNotes("");
  };

  const findAvailableTable = async (
    date: string,
    startTime: string,
    endTime: string,
    partySize: number
  ): Promise<{ tableId: string | null; status: "reserved" | "pending" }> => {
    try {
      // Get all tables for the business
      const { data: tables, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("max_capacity", { ascending: true });

      if (tablesError) throw tablesError;
      if (!tables || tables.length === 0) {
        return { tableId: null, status: "pending" };
      }

      // Get all bookings for the selected date and time range
      const { data: existingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("booking_date", date)
        .neq("status", "cancelled")
        .or(`and(start_time.lte.${endTime},end_time.gte.${startTime})`);

      if (bookingsError) throw bookingsError;

      const occupiedTableIds = new Set(
        existingBookings?.map((b) => b.table_id) || []
      );

      // Find the best available table
      // Priority: exact capacity > larger capacity
      const exactMatch = tables.find(
        (t) => t.max_capacity === partySize && !occupiedTableIds.has(t.id)
      );

      if (exactMatch) {
        return { tableId: exactMatch.id, status: "reserved" };
      }

      // Find smallest available table that fits
      const availableTable = tables.find(
        (t) => t.max_capacity >= partySize && !occupiedTableIds.has(t.id)
      );

      if (availableTable) {
        return { tableId: availableTable.id, status: "reserved" };
      }

      // No available table - booking will be pending
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

      // Validate form data
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

      const dateString = formData.booking_date.toISOString().split('T')[0];

      // Find available table
      const { tableId, status } = await findAvailableTable(
        dateString,
        formData.start_time,
        formData.end_time,
        formData.party_size
      );

      // Create booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        business_id: businessId,
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
      });

      if (bookingError) throw bookingError;

      if (status === "reserved") {
        toast.success("Reserva creada y mesa asignada automáticamente");
      } else {
        toast.warning("Reserva creada como pendiente - sin mesas disponibles para esta capacidad");
      }

      resetForm();
      setOpen(false);
      onBookingCreated();
    } catch (error: any) {
      console.error("Error creating booking:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Error al crear la reserva");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Reserva
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Crear Reserva Manual</DialogTitle>
            <DialogDescription>
              Registra una reserva telefónica o presencial. El sistema asignará automáticamente una mesa disponible.
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
                <Label htmlFor="end_time">Hora de fin *</Label>
                <TimePicker
                  time={endTime}
                  onTimeChange={setEndTime}
                  placeholder="16:00"
                />
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
