import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  client_name: string;
  businesses: {
    name: string;
    address: string;
  };
}

export const MyBookings = ({ userId }: { userId: string }) => {
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBookings();
  }, [userId]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          party_size,
          status,
          client_name,
          businesses (
            name,
            address
          )
        `)
        .eq("client_id", userId)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      const now = new Date();
      
      // Separar reservas según si ya pasó su hora de finalización
      const upcoming: Booking[] = [];
      const past: Booking[] = [];

      data?.forEach(booking => {
        // Crear fecha completa con hora de finalización
        const bookingEndDateTime = new Date(`${booking.booking_date}T${booking.end_time}`);
        
        if (bookingEndDateTime > now) {
          upcoming.push(booking as any);
        } else {
          past.push(booking as any);
        }
      });

      // Las próximas ya vienen ordenadas por fecha y hora ascendente
      // Las pasadas ordenar por fecha descendente (más recientes primero)
      past.sort((a, b) => {
        const dateA = new Date(`${a.booking_date}T${a.start_time}`);
        const dateB = new Date(`${b.booking_date}T${b.start_time}`);
        return dateB.getTime() - dateA.getTime();
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      reserved: "default",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
      no_show: "destructive",
      pending_confirmation: "secondary",
      pending: "secondary",
      delayed: "destructive",
      in_progress: "default"
    };

    const labels: Record<string, string> = {
      reserved: "Reservada",
      confirmed: "Confirmada",
      completed: "Completada",
      cancelled: "Cancelada",
      no_show: "No asistido",
      pending_confirmation: "No confirmada",
      pending: "Pendiente",
      delayed: "Retraso",
      in_progress: "En curso"
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const BookingCard = ({ booking }: { booking: Booking }) => (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{booking.businesses.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {booking.businesses.address}
            </CardDescription>
          </div>
          {getStatusBadge(booking.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            {format(new Date(booking.booking_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{booking.party_size} {booking.party_size === 1 ? "persona" : "personas"}</span>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="text-center py-8">Cargando reservas...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Reservas próximas</h2>
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tienes reservas próximas. ¡Descubre restaurantes en ZebraTime y haz tu primera reserva!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* Past Bookings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Reservas pasadas</h2>
        {pastBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No tienes reservas pasadas.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pastBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
