import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [pastBookingsOpen, setPastBookingsOpen] = useState(false);

  useEffect(() => {
    loadBookings();
    loadBusinessConfig();
    
    // Check for delayed bookings every minute
    const interval = setInterval(() => {
      checkAndUpdateDelayedBookings();
    }, 60000); // Check every minute

    // Initial check
    checkAndUpdateDelayedBookings();

    return () => clearInterval(interval);
  }, [businessId, selectedDate, selectedTime]);

  const loadBusinessConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("auto_mark_in_progress, auto_complete_in_progress, auto_complete_delayed, mark_delayed_as_no_show")
        .eq("id", businessId)
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error("Error loading business config:", error);
      return null;
    }
  };

  const checkAndUpdateDelayedBookings = async () => {
    try {
      const now = new Date();
      const currentDate = format(now, "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm:ss");

      console.log("🔄 Checking bookings...", { currentDate, currentTime });

      // Load business configuration
      const businessConfig = await loadBusinessConfig();
      if (!businessConfig) {
        console.log("⚠️ No business config found");
        return;
      }

      console.log("⚙️ Business config:", businessConfig);

      let updatedCount = 0;

      // Get all reserved bookings for today that should be marked as delayed or in-progress
      const { data: reservedBookings, error: reservedError } = await supabase
        .from("bookings")
        .select("id, start_time, booking_date, client_name")
        .eq("business_id", businessId)
        .eq("booking_date", currentDate)
        .eq("status", "reserved");

      if (reservedError) throw reservedError;

      // Update bookings based on configuration
      for (const booking of reservedBookings || []) {
        if (booking.start_time <= currentTime) {
          // If auto_mark_in_progress is enabled, mark as occupied (en curso)
          if (businessConfig.auto_mark_in_progress) {
            console.log(`✅ Auto-marking reserved booking as occupied (en curso) for ${booking.client_name}:`, booking.id);
            await supabase
              .from("bookings")
              .update({ status: "occupied" })
              .eq("id", booking.id);
            updatedCount++;
          } else {
            // Otherwise, mark as delayed (pending)
            console.log("⏰ Marking booking as delayed:", booking.id);
            await supabase
              .from("bookings")
              .update({ status: "pending" })
              .eq("id", booking.id);
            updatedCount++;
          }
        }
      }

      // Get all in-progress/occupied bookings that should be completed
      if (businessConfig.auto_complete_in_progress) {
        const { data: inProgressBookings, error: inProgressError } = await supabase
          .from("bookings")
          .select("id, end_time, booking_date, status, client_name")
          .eq("business_id", businessId)
          .eq("booking_date", currentDate)
          .in("status", ["in_progress", "occupied"]);

        if (!inProgressError && inProgressBookings) {
          console.log(`📊 Found ${inProgressBookings.length} in-progress bookings`);
          
          for (const booking of inProgressBookings) {
            if (booking.end_time <= currentTime) {
              console.log(`✅ Auto-completing in-progress booking for ${booking.client_name}:`, {
                id: booking.id,
                endTime: booking.end_time,
                currentTime
              });
              
              await supabase
                .from("bookings")
                .update({ status: "completed" })
                .eq("id", booking.id);
              updatedCount++;
            }
          }
        }
      } else {
        console.log("⏸️ Auto-complete for in-progress bookings is disabled");
      }

      // Get all delayed bookings that should be completed or marked as no-show
      const { data: delayedBookings, error: delayedError } = await supabase
        .from("bookings")
        .select("id, end_time, booking_date, status, client_name")
        .eq("business_id", businessId)
        .eq("booking_date", currentDate)
        .eq("status", "pending");

      if (!delayedError && delayedBookings) {
        console.log(`📊 Found ${delayedBookings.length} delayed bookings`);
        
        for (const booking of delayedBookings) {
          if (booking.end_time <= currentTime) {
            let newStatus = "pending"; // Keep as pending if no automation
            
            if (businessConfig.mark_delayed_as_no_show) {
              newStatus = "no_show";
              console.log(`❌ Marking delayed booking as no-show for ${booking.client_name}:`, booking.id);
            } else if (businessConfig.auto_complete_delayed) {
              newStatus = "completed";
              console.log(`✅ Auto-completing delayed booking for ${booking.client_name}:`, booking.id);
            }
            
            if (newStatus !== "pending") {
              await supabase
                .from("bookings")
                .update({ status: newStatus })
                .eq("id", booking.id);
              updatedCount++;
            } else {
              console.log(`⏸️ Delayed booking kept as pending (no automation enabled) for ${booking.client_name}`);
            }
          }
        }
      } else {
        console.log("⏸️ Auto-actions for delayed bookings are disabled");
      }

      if (updatedCount > 0) {
        console.log(`✨ Updated ${updatedCount} bookings, reloading...`);
        loadBookings();
      } else {
        console.log("✓ No bookings needed updating");
      }
    } catch (error) {
      console.error("❌ Error checking delayed bookings:", error);
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
      case "in_progress":
        return "bg-purple-500/20 text-purple-700 border border-purple-500";
      case "completed":
        return "bg-blue-500/20 text-blue-700 border border-blue-500";
      case "cancelled":
        return "bg-gray-500/20 text-gray-700 border border-gray-500";
      case "no_show":
        return "bg-destructive/20 text-destructive border border-destructive";
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
      case "in_progress":
        return "En curso";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "no_show":
        return "No Asistido";
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

        // Obtener la hora actual
        const now = new Date();
        const currentTime = format(now, "HH:mm:ss");
        const currentDate = format(now, "yyyy-MM-dd");
        const selectedDateString = format(selectedDate, "yyyy-MM-dd");

        // Separar reservas pasadas y futuras/actuales
        const pastBookings: Booking[] = [];
        const activeBookings: Booking[] = [];

        filteredBookings.forEach((booking) => {
          // Una reserva es "pasada" si su fecha es anterior a hoy
          // O si su fecha es hoy y su hora de finalización ya pasó
          const isPast = 
            booking.booking_date < currentDate || 
            (booking.booking_date === currentDate && booking.end_time < currentTime);
          
          if (isPast) {
            pastBookings.push(booking);
          } else {
            activeBookings.push(booking);
          }
        });

        // Ordenar las reservas pasadas por hora de inicio ascendente (ya están ordenadas)
        // No es necesario reordenar porque vienen ordenadas por start_time

        // Ordenar las reservas activas: primero por start_time, luego por end_time
        activeBookings.sort((a, b) => {
          if (a.start_time !== b.start_time) {
            return a.start_time.localeCompare(b.start_time);
          }
          return a.end_time.localeCompare(b.end_time);
        });

        const renderBookingCard = (booking: Booking) => (
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
        );

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
          <div className="space-y-4">
            {/* Bloque de reservas pasadas */}
            {pastBookings.length > 0 && (
              <Collapsible open={pastBookingsOpen} onOpenChange={setPastBookingsOpen}>
                <Card className="border-muted">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">Reservas pasadas</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {pastBookings.length}
                          </Badge>
                        </div>
                        <ChevronDown 
                          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                            pastBookingsOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-3">
                      {pastBookings.map(renderBookingCard)}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}

            {/* Reservas activas y futuras */}
            {activeBookings.length > 0 && (
              <div className="space-y-3">
                {activeBookings.map(renderBookingCard)}
              </div>
            )}
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
