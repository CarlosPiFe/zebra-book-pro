import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Calendar, Users, Clock, MapPin } from "lucide-react";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  status: string;
  tables?: {
    table_number: number;
  };
  business_rooms?: {
    name: string;
  };
}

interface Customer {
  client_name: string;
  client_email: string;
  client_phone: string;
  total_bookings: number;
  last_booking_date: string;
}

interface CustomerDetailSheetProps {
  customer: Customer | null;
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({
  customer,
  businessId,
  open,
  onOpenChange,
}: CustomerDetailSheetProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    if (customer && open) {
      loadCustomerData();
      loadBookings();
    }
  }, [customer, open]);

  const loadCustomerData = async () => {
    if (!customer) return;

    try {
      const { data, error } = await supabase
        .from("customer_notes")
        .select("rating, notes")
        .eq("business_id", businessId)
        .eq("client_email", customer.client_email)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setRating(data.rating || 0);
        setNotes(data.notes || "");
      } else {
        setRating(0);
        setNotes("");
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
    }
  };

  const loadBookings = async () => {
    if (!customer) return;

    setLoadingBookings(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          tables (table_number),
          business_rooms (name)
        `)
        .eq("business_id", businessId)
        .eq("client_email", customer.client_email)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast.error("Error al cargar el historial de reservas");
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleSave = async () => {
    if (!customer) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("customer_notes")
        .upsert({
          business_id: businessId,
          client_name: customer.client_name,
          client_email: customer.client_email,
          client_phone: customer.client_phone,
          rating: rating || null,
          notes: notes || null,
        }, {
          onConflict: "business_id,client_email"
        });

      if (error) throw error;

      toast.success("Valoración guardada correctamente");
    } catch (error) {
      console.error("Error saving customer note:", error);
      toast.error("Error al guardar la valoración");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "reserved":
        return "bg-orange-500/20 text-orange-700 border-orange-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-700 border-yellow-500";
      case "occupied":
        return "bg-green-500/20 text-green-700 border-green-500";
      case "completed":
        return "bg-blue-500/20 text-blue-700 border-blue-500";
      case "cancelled":
        return "bg-destructive/20 text-destructive border-destructive";
      case "no_show":
        return "bg-destructive/20 text-destructive border-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "reserved":
        return "Pendiente";
      case "pending":
        return "Retraso";
      case "occupied":
        return "En curso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "no_show":
        return "No Asistió";
      default:
        return status;
    }
  };

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">{customer.client_name}</SheetTitle>
          <SheetDescription>
            Información y valoración del cliente
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Información de Contacto</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{customer.client_email}</span>
              </p>
              {customer.client_phone && (
                <p>
                  <span className="text-muted-foreground">Teléfono:</span>{" "}
                  <span className="font-medium">{customer.client_phone}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Total de reservas:</span>{" "}
                <span className="font-medium">{customer.total_bookings}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Última reserva:</span>{" "}
                <span className="font-medium">
                  {format(
                    parse(customer.last_booking_date, "yyyy-MM-dd", new Date()),
                    "d 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}
                </span>
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label>Valoración del Cliente</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-colors"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes">Notas sobre el Cliente</Label>
            <Textarea
              id="notes"
              placeholder="Escribe tus observaciones sobre este cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "Guardando..." : "Guardar Valoración"}
          </Button>

          {/* Booking History */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Historial de Reservas</h3>
            {loadingBookings ? (
              <p className="text-sm text-muted-foreground">Cargando reservas...</p>
            ) : bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay reservas registradas</p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 space-y-2 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          "border",
                          getStatusColor(booking.status)
                        )}
                      >
                        {getStatusLabel(booking.status)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        <Calendar className="inline h-3 w-3 mr-1" />
                        {format(
                          parse(booking.booking_date, "yyyy-MM-dd", new Date()),
                          "d MMM yyyy",
                          { locale: es }
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {booking.start_time.substring(0, 5)} -{" "}
                          {booking.end_time.substring(0, 5)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span>{booking.party_size} personas</span>
                      </div>

                      {booking.tables && (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Mesa:</span>
                          <span className="font-medium">
                            {booking.tables.table_number}
                          </span>
                        </div>
                      )}

                      {booking.business_rooms && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span>{booking.business_rooms.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
