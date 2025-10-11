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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { z } from "zod";
import { format, parse, addMinutes } from "date-fns";
import { Info, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [clientName, setClientName] = useState(booking.client_name);
  const [clientEmail, setClientEmail] = useState(booking.client_email || "");
  const [clientPhone, setClientPhone] = useState(booking.client_phone || "");
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date(booking.booking_date));
  const [startTime, setStartTime] = useState(booking.start_time.substring(0, 5));
  const [endTime, setEndTime] = useState(booking.end_time.substring(0, 5));
  const [partySize, setPartySize] = useState(booking.party_size.toString());
  const [notes, setNotes] = useState(booking.notes || "");
  const [selectedTableId, setSelectedTableId] = useState<string>(booking.table_id || "auto");
  const [tables, setTables] = useState<Array<{ id: string; table_number: number; max_capacity: number; isAvailable: boolean }>>([]);

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
      setSelectedTableId(booking.table_id || "auto");

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

  // Load available tables when date/time changes
  useEffect(() => {
    if (open && bookingDate && startTime && endTime) {
      loadAvailableTables();
    }
  }, [open, bookingDate, startTime, endTime]);

  const loadAvailableTables = async () => {
    try {
      const dateString = format(bookingDate!, "yyyy-MM-dd");

      // Get all tables
      const { data: allTables, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      // Get occupied tables for this time slot (excluding current booking)
      const { data: existingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("booking_date", dateString)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .neq("id", booking.id)
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (bookingsError) throw bookingsError;

      const occupiedTableIds = new Set(
        existingBookings?.map((b) => b.table_id) || []
      );

      const tablesWithAvailability = allTables?.map((table) => ({
        id: table.id,
        table_number: table.table_number,
        max_capacity: table.max_capacity,
        isAvailable: !occupiedTableIds.has(table.id),
      })) || [];

      setTables(tablesWithAvailability);
    } catch (error) {
      console.error("Error loading tables:", error);
    }
  };

  // Auto-calculate end time when start time changes
  useEffect(() => {
    if (startTime && slotDuration) {
      const [hours, minutes] = startTime.split(":").map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = addMinutes(startDate, slotDuration);
      const calculatedEndTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setEndTime(calculatedEndTime);
      setCustomEndTime(false);
    }
  }, [startTime, slotDuration]);

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
        .neq("status", "completed")
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

      // Usar la fecha directamente sin conversión de zona horaria
      const dateString = format(formData.booking_date, "yyyy-MM-dd");

      let tableId: string | null;
      let status: "reserved" | "pending";

      // Check if manual table selection was made
      if (selectedTableId !== "auto") {
        // Verify the selected table is still available
        const selectedTable = tables.find(t => t.id === selectedTableId);
        if (selectedTable && selectedTable.isAvailable) {
          tableId = selectedTableId;
          status = "reserved";
        } else {
          toast.error("La mesa seleccionada ya no está disponible");
          return;
        }
      } else {
        // Use automatic assignment
        const result = await findAvailableTable(
          dateString,
          formData.start_time,
          formData.end_time,
          formData.party_size,
          booking.id
        );
        tableId = result.tableId;
        status = result.status;
      }

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

      if (selectedTableId !== "auto") {
        toast.success("Reserva actualizada con mesa asignada manualmente");
      } else if (status === "reserved") {
        toast.success("Reserva actualizada y mesa asignada automáticamente");
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
    try {
      setLoading(true);
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Reserva eliminada");
      setDeleteDialogOpen(false);
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Error al eliminar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", booking.id);

      if (error) throw error;

      const statusMessages: Record<string, string> = {
        occupied: "Cliente marcado como llegado",
        reserved: "Reserva marcada como reservada",
        pending: "Reserva marcada en retraso",
        completed: "Reserva marcada como completada",
      };

      toast.success(statusMessages[newStatus] || "Estado actualizado");
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Error al actualizar el estado");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", table_id: null })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Reserva cancelada");
      setCancelDialogOpen(false);
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Error al cancelar la reserva");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed", table_id: null })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Reserva completada y mesa liberada");
      onOpenChange(false);
      onBookingUpdated();
    } catch (error) {
      console.error("Error completing booking:", error);
      toast.error("Error al completar la reserva");
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
              <Label htmlFor="table_id">Mesa</Label>
              <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Asignación automática" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Asignación automática</SelectItem>
                  {tables.length > 0 && (
                    <>
                      {tables.filter(t => t.isAvailable).length > 0 && (
                        <>
                          <SelectItem value="divider-available" disabled className="text-xs font-semibold text-muted-foreground">
                            Mesas disponibles
                          </SelectItem>
                          {tables.filter(t => t.isAvailable).map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              Mesa {table.table_number} (capacidad: {table.max_capacity})
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {tables.filter(t => !t.isAvailable).length > 0 && (
                        <>
                          <SelectItem value="divider-occupied" disabled className="text-xs font-semibold text-muted-foreground">
                            Mesas ocupadas
                          </SelectItem>
                          {tables.filter(t => !t.isAvailable).map((table) => (
                            <SelectItem key={table.id} value={table.id} disabled>
                              Mesa {table.table_number} (ocupada)
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Puedes cambiar la mesa manualmente o dejar que el sistema la asigne
              </p>
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

          <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-between">
            {/* Left side: Status control buttons */}
            <div className="flex gap-2 w-full sm:w-auto">
              {(booking.status === "reserved" || booking.status === "pending") && (
                <Button
                  type="button"
                  className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleStatusChange("occupied")}
                  disabled={loading}
                >
                  Han llegado
                </Button>
              )}
              {booking.status === "occupied" && (
                <Button
                  type="button"
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleComplete}
                  disabled={loading}
                >
                  Completada
                </Button>
              )}
              {(booking.status === "reserved" || booking.status === "pending" || booking.status === "occupied") && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 sm:flex-none border-gray-500 text-gray-700 hover:bg-gray-100"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              )}
            </div>
            
            {/* Right side: Data action buttons */}
            <div className="flex gap-3 w-full sm:w-auto sm:ml-auto">
              <Button type="submit" disabled={loading} className="flex-1 sm:flex-none bg-black hover:bg-black/90 text-white">
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading}
                className="sm:w-auto w-12 p-3 hover:bg-transparent"
              >
                <Trash2 className="h-5 w-5 text-red-600" />
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro que quieres eliminar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La reserva será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              La reserva se guardará pero no ocupará mesa ni horario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive hover:bg-destructive/90">
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
