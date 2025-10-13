import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AvailabilityTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  selectedDate: Date;
  partySize?: number;
  onTimeSlotSelect: (startTime: string, endTime: string, tableId: string) => void;
}

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
}

interface Booking {
  id: string;
  table_id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  status: string;
  party_size: number;
}

interface TimeSlot {
  time: string;
  endTime: string;
}

export function AvailabilityTableDialog({
  open,
  onOpenChange,
  businessId,
  selectedDate,
  partySize,
  onTimeSlotSelect,
}: AvailabilityTableDialogProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadAvailabilityData();
    }
  }, [open, selectedDate, businessId]);

  const loadAvailabilityData = async () => {
    try {
      setLoading(true);
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const dayOfWeek = selectedDate.getDay();

      // Cargar configuración del negocio (duración de reserva)
      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("booking_slot_duration_minutes")
        .eq("id", businessId)
        .single();

      if (businessError) throw businessError;

      // Cargar mesas del negocio (filtrar por capacidad si se especifica partySize)
      let tablesQuery = supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (partySize && partySize > 0) {
        tablesQuery = tablesQuery.gte("max_capacity", partySize);
      }

      const { data: tablesData, error: tablesError } = await tablesQuery;

      if (tablesError) throw tablesError;

      // Cargar reservas del día
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("booking_date", dateString)
        .neq("status", "cancelled")
        .neq("status", "completed");

      if (bookingsError) throw bookingsError;

      // Cargar horario de disponibilidad del negocio para ese día
      const { data: availabilityData, error: availabilityError } = await supabase
        .from("availability_slots")
        .select("start_time, end_time")
        .eq("business_id", businessId)
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true });

      if (availabilityError) throw availabilityError;

      // Generar franjas horarias
      if (availabilityData && availabilityData.length > 0 && businessData) {
        const slots: TimeSlot[] = [];
        const slotDuration = businessData.booking_slot_duration_minutes;

        availabilityData.forEach((slot) => {
          const [startHour, startMin] = slot.start_time.split(":").map(Number);
          const [endHour, endMin] = slot.end_time.split(":").map(Number);

          let currentTime = startHour * 60 + startMin;
          let endTime = endHour * 60 + endMin;

          // Detectar cruce de medianoche: si la hora de fin es menor que la de inicio,
          // significa que el horario se extiende al día siguiente
          if (endTime <= currentTime) {
            // Añadir 24 horas (1440 minutos) a la hora de fin para tratarla como del día siguiente
            endTime += 24 * 60;
          }

          while (currentTime < endTime) {
            const hours = Math.floor(currentTime / 60) % 24; // Aplicar módulo 24 para manejar horas >= 24
            const minutes = currentTime % 60;
            const nextTime = currentTime + slotDuration;
            const nextHours = Math.floor(nextTime / 60) % 24;
            const nextMinutes = nextTime % 60;

            slots.push({
              time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
              endTime: `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`,
            });

            currentTime = nextTime;
          }
        });

        setTimeSlots(slots);
      }

      setTables(tablesData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error loading availability:", error);
      toast.error("Error al cargar la disponibilidad");
    } finally {
      setLoading(false);
    }
  };

  const isTableOccupied = (tableId: string, slotTime: string, slotEndTime: string): Booking | null => {
    return bookings.find((booking) => {
      if (booking.table_id !== tableId) return false;
      
      // Convertir horas a minutos para comparación más fácil
      const parseTime = (time: string): number => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };
      
      const slotStart = parseTime(slotTime);
      const slotEnd = parseTime(slotEndTime);
      const bookingStart = parseTime(booking.start_time);
      const bookingEnd = parseTime(booking.end_time);
      
      // Manejar caso de cruce de medianoche en slot
      let adjustedSlotEnd = slotEnd;
      if (slotEnd < slotStart) {
        adjustedSlotEnd += 24 * 60; // Añadir 24 horas
      }
      
      // Manejar caso de cruce de medianoche en booking
      let adjustedBookingEnd = bookingEnd;
      if (bookingEnd < bookingStart) {
        adjustedBookingEnd += 24 * 60; // Añadir 24 horas
      }
      
      // Verificar solapamiento: hay conflicto si el inicio de uno es antes del fin del otro
      // y el inicio del otro es antes del fin del primero
      return bookingStart < adjustedSlotEnd && slotStart < adjustedBookingEnd;
    }) || null;
  };

  const handleCellClick = (tableId: string, startTime: string, endTime: string) => {
    const booking = isTableOccupied(tableId, startTime, endTime);
    if (!booking) {
      onTimeSlotSelect(startTime, endTime, tableId);
      onOpenChange(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Cargando disponibilidad...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Disponibilidad - {format(selectedDate, "dd/MM/yyyy")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-background z-10">
                <tr>
                  <th className="border border-border p-2 bg-muted font-semibold text-left min-w-[100px]">
                    Hora
                  </th>
                  {tables.map((table) => (
                    <th
                      key={table.id}
                      className="border border-border p-2 bg-muted font-semibold text-center min-w-[120px]"
                    >
                      <div>Mesa {table.table_number}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        ({table.max_capacity} personas)
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot) => (
                  <tr key={slot.time}>
                    <td className="border border-border p-2 bg-muted/50 font-medium text-sm">
                      {slot.time} - {slot.endTime}
                    </td>
                    {tables.map((table) => {
                      const booking = isTableOccupied(table.id, slot.time, slot.endTime);
                      const isOccupied = !!booking;

                      return (
                        <TooltipProvider key={table.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <td
                                className={cn(
                                  "border border-border p-3 text-center transition-colors",
                                  isOccupied
                                    ? "bg-destructive/20 cursor-not-allowed"
                                    : "bg-green-500/10 hover:bg-green-500/20 cursor-pointer"
                                )}
                                onClick={() => {
                                  if (!isOccupied) {
                                    handleCellClick(table.id, slot.time, slot.endTime);
                                  }
                                }}
                              >
                                {isOccupied ? (
                                  <span className="text-xs font-medium text-destructive">
                                    Ocupado
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-green-700">
                                    Disponible
                                  </span>
                                )}
                              </td>
                            </TooltipTrigger>
                            {isOccupied && booking && (
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-semibold">{booking.client_name}</p>
                                  <p className="text-xs">
                                    {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                  </p>
                                  <p className="text-xs">{booking.party_size} personas</p>
                                  {booking.status && (
                                    <p className="text-xs capitalize">Estado: {booking.status}</p>
                                  )}
                                </div>
                              </TooltipContent>
                            )}
                            {!isOccupied && (
                              <TooltipContent side="top">
                                <p className="text-xs">
                                  Click para crear reserva en esta franja horaria
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
