import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User } from "lucide-react";

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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>("");

  useEffect(() => {
    loadBookings();
  }, [businessId, selectedDate, selectedTime]);

  const loadBookings = async () => {
    try {
      let query = supabase
        .from("bookings")
        .select(`
          *,
          tables (
            table_number
          )
        `)
        .eq("business_id", businessId)
        .eq("booking_date", selectedDate)
        .order("start_time", { ascending: true });

      if (selectedTime) {
        query = query
          .lte("start_time", selectedTime)
          .gte("end_time", selectedTime);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Error al cargar las reservas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-accent text-accent-foreground";
      case "pending":
        return "bg-yellow-500 text-white";
      case "cancelled":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "pending":
        return "Pendiente";
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Reservas</h1>
        <p className="text-muted-foreground">
          Gestiona y visualiza todas las reservas de tu negocio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtra reservas por fecha y hora específica (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora (opcional)</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                placeholder="Dejar vacío para ver todas"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>No hay reservas para esta fecha{selectedTime && " y hora"}</p>
              <p className="text-sm mt-2">
                {selectedTime 
                  ? "Intenta cambiar la hora o seleccionar solo la fecha"
                  : "Las reservas aparecerán aquí cuando los clientes las realicen"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{booking.client_name}</span>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(booking.booking_date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          {booking.start_time} - {booking.end_time}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{booking.party_size} personas</span>
                      </div>
                      {booking.tables && (
                        <div className="font-medium text-accent">
                          Mesa {booking.tables.table_number}
                        </div>
                      )}
                    </div>

                    {booking.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notas: </span>
                        <span className="text-muted-foreground">{booking.notes}</span>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                      {booking.client_email && (
                        <span className="text-muted-foreground">{booking.client_email}</span>
                      )}
                      {booking.client_phone && (
                        <span className="text-muted-foreground">{booking.client_phone}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
