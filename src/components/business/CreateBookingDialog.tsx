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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Plus, Info, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { format } from "date-fns";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import { Alert, AlertDescription } from "@/components/ui/alert";

const createBookingSchema = (isHospitality: boolean) => z.object({
  client_name: z.string().trim().min(1, "El nombre es requerido").max(100),
  client_email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  client_phone: z.string().trim().max(20).optional().or(z.literal("")),
  booking_date: z.date(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Formato de hora inválido"),
  party_size: isHospitality 
    ? z.number().min(1, "Mínimo 1 persona").max(50) 
    : z.number().optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
});

interface CreateBookingDialogProps {
  businessId: string;
  onBookingCreated: () => void;
}

interface Business {
  booking_slot_duration_minutes: number;
  category: string;
}

export function CreateBookingDialog({ businessId, onBookingCreated }: CreateBookingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slotDuration, setSlotDuration] = useState(60);
  const [businessCategory, setBusinessCategory] = useState("");
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [availabilityError, setAvailabilityError] = useState("");
  
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [customEndTime, setCustomEndTime] = useState(false);
  const [partySize, setPartySize] = useState("2");
  const [notes, setNotes] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string>("auto");
  const [tables, setTables] = useState<Array<{ id: string; table_number: number; max_capacity: number; isAvailable: boolean }>>([]);

  // Use availability hook
  const { hasAvailableTables } = useBookingAvailability(businessId);

  // Load business slot duration, category, and availability when dialog opens
  useEffect(() => {
    if (!open) return;
    
    const loadBusinessSettings = async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("booking_slot_duration_minutes, category")
        .eq("id", businessId)
        .single();

      if (!error && data) {
        setSlotDuration(data.booking_slot_duration_minutes);
        setBusinessCategory(data.category);
      }

      // Load availability slots to determine open days
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("availability_slots")
        .select("day_of_week")
        .eq("business_id", businessId);

      if (!availabilityError && availabilityData) {
        const uniqueDays = [...new Set(availabilityData.map(slot => slot.day_of_week))];
        setOpenDays(uniqueDays);
      }
    };

    loadBusinessSettings();
  }, [businessId, open]);

  // Function to check if a date is available (business is open)
  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return openDays.includes(dayOfWeek);
  };

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

  // Load available tables when date/time changes
  useEffect(() => {
    if (bookingDate && startTime && endTime) {
      loadAvailableTables();
    }
  }, [bookingDate, startTime, endTime]);

  // Check availability when relevant fields change
  useEffect(() => {
    if (bookingDate && startTime && endTime && partySize && businessCategory) {
      checkAvailability();
    }
  }, [bookingDate, startTime, endTime, partySize, businessCategory]);

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

      // Get occupied tables for this time slot
      const { data: existingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("booking_date", dateString)
        .neq("status", "cancelled")
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

  const checkAvailability = async () => {
    const isHospitality = businessCategory.toLowerCase() === "restaurante" || businessCategory.toLowerCase() === "bar";
    if (!isHospitality || !bookingDate || !startTime || !endTime) {
      setAvailabilityError("");
      return;
    }

    const dateString = format(bookingDate, "yyyy-MM-dd");
    const hasAvailability = await hasAvailableTables(dateString, startTime, parseInt(partySize));
    
    if (!hasAvailability) {
      setAvailabilityError("* No queda disponibilidad para esta hora");
    } else {
      setAvailabilityError("");
    }
  };

  const resetForm = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setBookingDate(new Date());
    setStartTime("");
    setEndTime("");
    setCustomEndTime(false);
    setPartySize("2");
    setNotes("");
    setSelectedTableId("auto");
    setTables([]);
    setAvailabilityError("");
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
      // Using < and > (not <= and >=) so end time is exclusive - allows back-to-back bookings
      const { data: existingBookings, error: bookingsError } = await supabase
        .from("bookings")
        .select("table_id")
        .eq("booking_date", date)
        .neq("status", "cancelled")
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

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

      const isHospitality = businessCategory.toLowerCase() === "restaurante" || businessCategory.toLowerCase() === "bar";

      // Check availability before creating booking
      if (isHospitality) {
        const dateString = format(bookingDate, "yyyy-MM-dd");
        const hasAvailability = await hasAvailableTables(dateString, startTime, parseInt(partySize));
        
        if (!hasAvailability) {
          toast.error("No hay disponibilidad para esta hora y número de comensales");
          return;
        }
      }

      // Validate form data
      const bookingSchema = createBookingSchema(isHospitality);
      const formData = bookingSchema.parse({
        client_name: clientName,
        client_email: clientEmail || undefined,
        client_phone: clientPhone || undefined,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        party_size: isHospitality ? parseInt(partySize) : undefined,
        notes: notes || undefined,
      });

      // Usar la fecha directamente sin conversión de zona horaria
      const dateString = format(formData.booking_date, "yyyy-MM-dd");

      let tableId: string | null = null;
      let status: "reserved" | "pending" = "reserved";

      // Only handle table assignment for hospitality businesses
      if (isHospitality) {
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
            formData.party_size || 1
          );
          tableId = result.tableId;
          status = result.status;
        }
      }

      // Create booking
      const { error: bookingError } = await supabase.from("bookings").insert({
        business_id: businessId,
        client_name: formData.client_name,
        client_email: formData.client_email || null,
        client_phone: formData.client_phone || null,
        booking_date: dateString,
        start_time: formData.start_time,
        end_time: formData.end_time,
        party_size: formData.party_size || null,
        notes: formData.notes || null,
        table_id: tableId,
        status: status,
      });

      if (bookingError) throw bookingError;

      if (selectedTableId !== "auto") {
        toast.success("Reserva creada con mesa asignada manualmente");
      } else if (status === "reserved") {
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
              
              {(businessCategory.toLowerCase() === "restaurante" || businessCategory.toLowerCase() === "bar") && (
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
              )}
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
                disabled={(date) => !isDateAvailable(date)}
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

            {(businessCategory.toLowerCase() === "restaurante" || businessCategory.toLowerCase() === "bar") && (
              <div className="space-y-2">
                <Label htmlFor="table_id">Mesa (opcional)</Label>
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
                {tables.length === 0 && startTime && endTime && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Selecciona fecha y hora para ver mesas disponibles
                  </p>
                )}
              </div>
            )}

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

            {availabilityError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-semibold">{availabilityError}</AlertDescription>
              </Alert>
            )}
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
            <Button type="submit" disabled={loading || !!availabilityError}>
              {loading ? "Creando..." : "Crear Reserva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
