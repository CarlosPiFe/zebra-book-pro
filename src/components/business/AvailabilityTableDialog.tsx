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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface AvailabilityTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  selectedDate: Date;
  partySize?: number;
  onTimeSlotSelect: (startTime: string, endTime: string, tableId: string) => void;
}

interface Room {
  id: string;
  name: string;
}

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
  min_capacity: number;
  room_id: string | null;
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
  partySize: initialPartySize,
  onTimeSlotSelect,
}: AvailabilityTableDialogProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [partySize, setPartySize] = useState(initialPartySize || 2);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, selectedDate, businessId]);

  useEffect(() => {
    if (initialPartySize) {
      setPartySize(initialPartySize);
    }
  }, [initialPartySize]);

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

      // 2. Cargar todas las mesas
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      // 3. Cargar salas
      const { data: roomsData, error: roomsError } = await supabase
        .from("business_rooms")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name");

      if (roomsError) throw roomsError;

      // 4. Cargar reservas del día (solo activas)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("booking_date", dateString)
        .neq("status", "cancelled")
        .neq("status", "completed");

      if (bookingsError) throw bookingsError;

      // 5. Cargar horarios de apertura para el día
      const { data: availability, error: availabilityError } = await supabase
        .from("availability_slots")
        .select("start_time, end_time")
        .eq("business_id", businessId)
        .eq("day_of_week", dayOfWeek)
        .order("start_time", { ascending: true });

      if (availabilityError) throw availabilityError;

      // 6. Generar franjas horarias
      let slots = generateTimeSlots(availability, business.booking_slot_duration_minutes);

      // 7. Filtrar horas pasadas si es hoy
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const selectedDateString = format(selectedDate, "yyyy-MM-dd");
      const isToday = selectedDateString === todayString;

      if (isToday) {
        slots = slots.filter((slot) => {
          const [hour = 0, minute = 0] = slot.endTime.split(':').map(Number);
          const slotEndDateTime = new Date(selectedDate);
          slotEndDateTime.setHours(hour, minute, 0, 0);
          return slotEndDateTime > now;
        });
      }

      setTables(tablesData || []);
      setRooms(roomsData || []);
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

      if (endMinutes <= currentMinutes) {
        endMinutes += 24 * 60;
      }

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

    if (slotEndMin <= slotStartMin) {
      slotEndMin += 24 * 60;
    }

    return bookings.find((booking) => {
      if (booking.table_id !== tableId) return false;

      const bookingStartMin = parseTime(booking.start_time);
      let bookingEndMin = parseTime(booking.end_time);

      if (bookingEndMin <= bookingStartMin) {
        bookingEndMin += 24 * 60;
      }

      return bookingStartMin < slotEndMin && slotStartMin < bookingEndMin;
    }) || null;
  };

  const getCellStatus = (table: Table, slot: TimeSlot): 'available' | 'occupied' | 'insufficient' => {
    // Check capacity
    if (table.max_capacity < partySize || table.min_capacity > partySize) {
      return 'insufficient';
    }

    // Check if occupied
    const booking = isSlotOccupied(table.id, slot.startTime, slot.endTime);
    if (booking) {
      return 'occupied';
    }

    return 'available';
  };

  const handleSlotClick = (tableId: string, startTime: string, endTime: string, status: string) => {
    if (status === 'available') {
      onTimeSlotSelect(startTime, endTime, tableId);
      onOpenChange(false);
    }
  };

  const filteredTables = selectedRoom === "all" 
    ? tables 
    : tables.filter(table => table.room_id === selectedRoom);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
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
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Disponibilidad - {format(selectedDate, "dd/MM/yyyy")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Party Size Filter */}
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="party-size">Número de Comensales</Label>
              <Input
                id="party-size"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Room Tabs */}
          <Tabs value={selectedRoom} onValueChange={setSelectedRoom} className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              {rooms.map((room) => (
                <TabsTrigger key={room.id} value={room.id}>
                  {room.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedRoom} className="flex-1 overflow-hidden mt-4 flex flex-col">
              {/* Fixed Header Row */}
              <div className="grid gap-1 border-b pb-2 mb-2 bg-background" style={{
                gridTemplateColumns: `80px repeat(${filteredTables.length}, minmax(64px, 1fr))`
              }}>
                <div className="font-semibold px-2 text-sm">
                  Hora
                </div>
                {filteredTables.map((table) => (
                  <div
                    key={table.id}
                    className="text-center px-1 w-16"
                  >
                    <div className="text-base font-bold">{table.table_number}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5">
                      <Users size={14} />
                      <span>{table.max_capacity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Scrollable Time Slots */}
              <ScrollArea className="flex-1">
                <div className="grid gap-1" style={{
                  gridTemplateColumns: `80px repeat(${filteredTables.length}, minmax(64px, 1fr))`
                }}>
                  {timeSlots.map((slot, slotIndex) => (
                    <>
                      <div key={`time-${slotIndex}`} className="py-1.5 text-sm font-medium px-2 flex items-center">
                        {slot.startTime}
                      </div>
                      {filteredTables.map((table) => {
                        const status = getCellStatus(table, slot);
                        const booking = isSlotOccupied(table.id, slot.startTime, slot.endTime);

                        return (
                          <Card
                            key={`${slot.startTime}-${table.id}`}
                            className={cn(
                              "p-1.5 text-center text-xs transition-colors flex items-center justify-center min-h-[48px]",
                              status === 'available' && "bg-green-500/20 hover:bg-green-500/30 cursor-pointer border-green-500/30",
                              status === 'occupied' && "bg-destructive/20 cursor-not-allowed border-destructive/30",
                              status === 'insufficient' && "bg-muted/50 cursor-not-allowed border-muted"
                            )}
                            onClick={() => handleSlotClick(table.id, slot.startTime, slot.endTime, status)}
                          >
                            {status === 'available' && (
                              <div className="font-medium text-green-700 dark:text-green-300">
                                Libre
                              </div>
                            )}
                            {status === 'occupied' && booking && (
                              <div className="space-y-0.5">
                                <div className="font-medium text-destructive text-[10px]">Ocupada</div>
                                <div className="text-[9px] text-muted-foreground">
                                  {booking.client_name}
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {booking.party_size}p
                                </div>
                              </div>
                            )}
                            {status === 'insufficient' && (
                              <div className="text-[10px] text-muted-foreground">
                                No apta
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
