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
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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
  min_capacity: number;
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
  startTime: string;
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
      loadData();
    }
  }, [open, selectedDate, businessId, partySize]);

  const loadData = async () => {
    try {
      setLoading(true);
      const dateString = format(selectedDate, "yyyy-MM-dd");
      const dayOfWeek = selectedDate.getDay();

      // 1. Cargar configuración del negocio
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("booking_slot_duration_minutes")
        .eq("id", businessId)
        .single();

      if (businessError) throw businessError;

      // 2. Cargar mesas (filtradas por capacidad si se especifica)
      let tablesQuery = supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (partySize && partySize > 0) {
        tablesQuery = tablesQuery
          .gte("max_capacity", partySize)
          .lte("min_capacity", partySize);
      }

      const { data: tablesData, error: tablesError } = await tablesQuery;
      if (tablesError) throw tablesError;

      // 3. Cargar reservas del día (solo activas)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("booking_date", dateString)
        .neq("status", "cancelled")
        .neq("status", "completed");

      if (bookingsError) throw bookingsError;

      // 4. Cargar horarios de apertura para el día
      const { data: availability, error: availabilityError } = await supabase
        .from("availability_slots")
        .select("start_time, end_time")
        .eq("business_id", businessId)
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true });

      if (availabilityError) throw availabilityError;

      // 5. Generar franjas horarias
      let slots = generateTimeSlots(availability, business.booking_slot_duration_minutes);

      // 6. Filtrar horas pasadas si es hoy
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const selectedDateString = format(selectedDate, "yyyy-MM-dd");
      const isToday = selectedDateString === todayString;

      if (isToday) {
        console.log('Filtrando horas pasadas para hoy en cuadrante de disponibilidad...');
        slots = slots.filter((slot) => {
          const [hour = 0, minute = 0] = slot.endTime.split(':').map(Number);
          const slotEndDateTime = new Date(selectedDate);
          slotEndDateTime.setHours(hour, minute, 0, 0);

          const isFuture = slotEndDateTime > now;
          return isFuture;
        });
        console.log('Slots después de filtrar horas pasadas:', slots);
      }

      setTables(tablesData || []);
      setBookings((bookingsData || []) as any);
      setTimeSlots(slots);
    } catch (error) {
      console.error("Error loading availability:", error);
      toast.error("Error al cargar la disponibilidad");
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (
    availability: Array<{ start_time: string; end_time: string }>,
    slotDuration: number
  ): TimeSlot[] => {
    const slots: TimeSlot[] = [];

    availability.forEach((period) => {
      const [startHour = 0, startMin = 0] = period.start_time.split(":").map(Number);
      const [endHour = 0, endMin = 0] = period.end_time.split(":").map(Number);

      let currentMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;

      // Detectar cruce de medianoche
      if (endMinutes <= currentMinutes) {
        endMinutes += 24 * 60;
      }

      // Generar slots
      while (currentMinutes < endMinutes) {
        const nextMinutes = currentMinutes + slotDuration;
        
        const startH = Math.floor(currentMinutes / 60) % 24;
        const startM = currentMinutes % 60;
        const endH = Math.floor(nextMinutes / 60) % 24;
        const endM = nextMinutes % 60;

        slots.push({
          startTime: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
          endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
        });

        currentMinutes = nextMinutes;
      }
    });

    return slots;
  };

  const isSlotOccupied = (tableId: string, slotStart: string, slotEnd: string): Booking | null => {
    const parseTime = (time: string): number => {
      const [hours = 0, minutes = 0] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    const slotStartMin = parseTime(slotStart);
    let slotEndMin = parseTime(slotEnd);

    // Si el slot cruza medianoche
    if (slotEndMin <= slotStartMin) {
      slotEndMin += 24 * 60;
    }

    return bookings.find((booking) => {
      if (booking.table_id !== tableId) return false;

      const bookingStartMin = parseTime(booking.start_time);
      let bookingEndMin = parseTime(booking.end_time);

      // Si la reserva cruza medianoche
      if (bookingEndMin <= bookingStartMin) {
        bookingEndMin += 24 * 60;
      }

      // Verificar solapamiento
      return bookingStartMin < slotEndMin && slotStartMin < bookingEndMin;
    }) || null;
  };

  const handleSlotClick = (tableId: string, startTime: string, endTime: string) => {
    const occupied = isSlotOccupied(tableId, startTime, endTime);
    if (!occupied) {
      onTimeSlotSelect(startTime, endTime, tableId);
      onOpenChange(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Disponibilidad de Mesas</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
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
                {timeSlots.map((slot, index) => (
                  <tr key={index}>
                    <td className="border border-border p-2 bg-muted/50 font-medium text-sm">
                      {slot.startTime} - {slot.endTime}
                    </td>
                    {tables.map((table) => {
                      const booking = isSlotOccupied(table.id, slot.startTime, slot.endTime);
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
                                    handleSlotClick(table.id, slot.startTime, slot.endTime);
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
