import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import { CreateBookingDialog } from "./CreateBookingDialog";
import { EditBookingDialog } from "./EditBookingDialog";
import { format, parse } from "date-fns";

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
  tables?: {
    table_number: number;
  };
}

interface BookingsViewProps {
  businessId: string;
  businessName: string;
}

export function BookingsView({ businessId }: BookingsViewProps) {
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const dateParam = searchParams.get("date");
    return dateParam ? new Date(dateParam) : new Date();
  });
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [searchName, setSearchName] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadBookings();
    
    // Check for delayed bookings every minute
    const interval = setInterval(() => {
      checkAndUpdateDelayedBookings();
    }, 60000); // Check every minute

    // Initial check
    checkAndUpdateDelayedBookings();

    return () => clearInterval(interval);
  }, [businessId, selectedDate, selectedTime]);

  const checkAndUpdateDelayedBookings = async () => {
    try {
      const now = new Date();
      const currentDate = format(now, "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm");

      // Get all reserved bookings for today
      const { data: reservedBookings, error } = await supabase
        .from("bookings")
        .select("id, start_time, booking_date")
        .eq("business_id", businessId)
        .eq("booking_date", currentDate)
        .eq("status", "reserved");

      if (error) throw error;

      // Update bookings that are delayed
      for (const booking of reservedBookings || []) {
        if (booking.start_time < currentTime) {
          await supabase
            .from("bookings")
            .update({ status: "pending" })
            .eq("id", booking.id);
        }
      }

      // Reload bookings if any were updated
      if (reservedBookings && reservedBookings.length > 0) {
        loadBookings();
      }
    } catch (error) {
      console.error("Error checking delayed bookings:", error);
    }
  };

  const loadBookings = async () => {
    try {
      // Usar la fecha directamente sin conversión de zona horaria
      const dateString = format(selectedDate, "yyyy-MM-dd");
      
      console.log("Loading bookings for:", { businessId, dateString, selectedTime });
      
      let query = supabase
        .from("bookings")
        .select(`
          *,
          tables (
            table_number
          )
        `)
        .eq("business_id", businessId)
        .eq("booking_date", dateString)
        .order("start_time", { ascending: true });

      if (selectedTime) {
        query = query
          .lte("start_time", selectedTime)
          .gte("end_time", selectedTime);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching bookings:", error);
        toast.error(`Error al cargar las reservas: ${error.message}`);
        throw error;
      }

      console.log("Bookings loaded successfully:", data);
      setBookings(data || []);
    } catch (error: any) {
      console.error("Error loading bookings (catch):", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      toast.error("Error al cargar las reservas. Por favor, verifica los logs.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reserved":
        return "bg-orange-500/20 text-orange-700 border border-orange-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 border border-yellow-500";
      case "occupied":
        return "bg-green-500/20 text-green-700 border border-green-500";
      case "completed":
        return "bg-blue-500/20 text-blue-700 border border-blue-500";
      case "cancelled":
        return "bg-gray-500/20 text-gray-700 border border-gray-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "reserved":
        return "Reservada";
      case "pending":
        return "Retraso";
      case "occupied":
        return "En curso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Reservas</h1>
          <p className="text-muted-foreground">
            Gestiona y visualiza todas las reservas de tu negocio
          </p>
        </div>
        <CreateBookingDialog businessId={businessId} onBookingCreated={loadBookings} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra reservas por fecha, hora y nombre del comensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => date && setSelectedDate(date)}
                placeholder="Seleccionar fecha"
              />
            </div>
            <div className="space-y-2">
              <Label>Hora (opcional)</Label>
              <TimePicker
                time={selectedTime}
                onTimeChange={setSelectedTime}
                placeholder="Ver todas las horas"
                allowClear={true}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre del comensal</Label>
              <Input
                type="text"
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {(() => {
        // Filtrar reservas por nombre del comensal
        const filteredBookings = bookings.filter((booking) => {
          if (!searchName) return true;
          return booking.client_name?.toLowerCase().includes(searchName.toLowerCase());
        });

        return filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>No hay reservas para esta fecha{selectedTime && " y hora"}{searchName && " y nombre"}</p>
                <p className="text-sm mt-2">
                  {searchName 
                    ? "Intenta cambiar el nombre o dejar el campo vacío"
                    : selectedTime 
                    ? "Intenta cambiar la hora o dejar el campo vacío"
                    : "Las reservas aparecerán aquí cuando los clientes las realicen"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((booking) => (
            <Card 
              key={booking.id} 
              className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
              onClick={() => {
                setSelectedBooking(booking);
                setEditDialogOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <Badge className={getStatusColor(booking.status)}>
                      {getStatusLabel(booking.status)}
                    </Badge>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {parse(booking.booking_date, "yyyy-MM-dd", new Date()).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{booking.party_size} personas</span>
                    </div>

                    {booking.tables && (
                      <div className="font-medium text-sm text-accent">
                        Mesa {booking.tables.table_number}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-sm font-medium text-foreground">
                    {booking.client_name}
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        );
      })()}

      {selectedBooking && (
        <EditBookingDialog
          booking={selectedBooking}
          businessId={businessId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onBookingUpdated={loadBookings}
        />
      )}
    </div>
  );
}
