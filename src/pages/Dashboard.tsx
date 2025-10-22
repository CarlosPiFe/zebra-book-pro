import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Building2, Clock, Settings, Users, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EditBookingDialog } from "@/components/business/EditBookingDialog";

interface Profile {
  id: string;
  email: string;
  full_name: string;
}

interface UserRole {
  role: "owner" | "client";
}

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  image_url?: string;
  address?: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  party_size: number;
  table_id: string;
  businesses: {
    name: string;
  };
  tables?: {
    table_number: number;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<"owner" | "client">("client");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [pastBookingsOpen, setPastBookingsOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  // Redirect to home if user is owner but has no businesses
  useEffect(() => {
    if (!loading && userRole === "owner" && businesses.length === 0) {
      navigate("/");
    }
  }, [loading, userRole, businesses, navigate]);

  // Setup realtime subscription for bookings updates
  useEffect(() => {
    if (businesses.length === 0) return;

    const channel = supabase
      .channel('dashboard-bookings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          // Reload bookings when any change occurs
          loadUserData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businesses]);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load user role from secure user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (roleError) throw roleError;
      const role = roleData.role as "owner" | "client";
      setUserRole(role);

      // Load data based on role
      if (role === "owner") {
        const { data: businessData } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session.user.id);
        
        setBusinesses(businessData || []);

        // Load bookings for owner's businesses
        if (businessData && businessData.length > 0) {
          const businessIds = businessData.map((b) => b.id);
          
          // Get current date and time in local format
          const now = new Date();
          const currentDate = now.toISOString().split('T')[0];
          const currentTime = now.toTimeString().split(' ')[0].substring(0, 8);
          
          // Load upcoming bookings (próximas reservas) - max 50
          const { data: upcomingBookings } = await supabase
            .from("bookings")
            .select("*, businesses(name), tables(table_number)")
            .in("business_id", businessIds)
            .or(`booking_date.gt.${currentDate},and(booking_date.eq.${currentDate},end_time.gte.${currentTime})`)
            .order("booking_date", { ascending: true })
            .order("start_time", { ascending: true })
            .order("end_time", { ascending: true })
            .limit(50);
          
          // Load past bookings (reservas pasadas) - max 25
          const { data: pastBookingsData } = await supabase
            .from("bookings")
            .select("*, businesses(name), tables(table_number)")
            .in("business_id", businessIds)
            .or(`booking_date.lt.${currentDate},and(booking_date.eq.${currentDate},end_time.lt.${currentTime})`)
            .order("booking_date", { ascending: false })
            .order("start_time", { ascending: false })
            .limit(25);
          
          setBookings(upcomingBookings || []);
          setPastBookings(pastBookingsData || []);
        }
      } else {
        // Load bookings for client
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("*, businesses(name)")
          .eq("client_id", session.user.id)
          .order("booking_date", { ascending: true });
        
        setBookings(bookingData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Para owners, mostrar vista centrada en el negocio
  if (userRole === "owner") {
    const mainBusiness = businesses[0];

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 pt-24 pb-12">
          {businesses.length === 0 ? (
            // Vista cuando no hay negocios
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6 text-center py-16">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Crea tu primer negocio</h2>
                  <p className="text-muted-foreground mb-6">
                    Comienza a gestionar reservas, horarios y más para tu negocio
                  </p>
                  <Button
                    onClick={() => navigate("/business/create")}
                    size="lg"
                    className="bg-accent hover:bg-accent/90"
                  >
                    <Building2 className="mr-2 h-5 w-5" />
                    Crear Negocio
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            // Vista centrada en el negocio
            <div className="space-y-8">
              {/* Banner del negocio - idéntico a la vista pública */}
              {mainBusiness.image_url ? (
                <div className="relative h-96 w-full rounded-xl overflow-hidden mb-6">
                  <img
                    src={mainBusiness.image_url}
                    alt={mainBusiness.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      {mainBusiness.name}
                    </h1>
                    <p className="text-lg text-muted-foreground">{mainBusiness.category}</p>
                  </div>
                  {businesses.length > 1 && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-background/80 backdrop-blur-sm rounded-full text-sm text-foreground">
                        +{businesses.length - 1} más
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{mainBusiness.name}</h1>
                    {businesses.length > 1 && (
                      <span className="px-3 py-1 bg-muted rounded-full text-sm text-muted-foreground">
                        +{businesses.length - 1} más
                      </span>
                    )}
                  </div>
                  <p className="text-lg text-muted-foreground capitalize">{mainBusiness.category}</p>
                </div>
              )}

              {/* Botón principal de gestión */}
              <div className="flex justify-center py-4">
                <Button 
                  size="lg" 
                  className="bg-accent hover:bg-accent/90"
                  onClick={() => navigate(`/business/${mainBusiness.id}/manage`)}
                >
                  Gestionar Negocio
                </Button>
              </div>

              {/* Selector de negocios si hay más de uno */}
              {businesses.length > 1 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Otros negocios</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {businesses.slice(1).map((business) => (
                      <Card
                        key={business.id}
                        className="cursor-pointer hover:shadow-medium transition-shadow"
                        onClick={() => navigate(`/business/${business.id}/manage`)}
                      >
                        <CardHeader>
                          <CardTitle>{business.name}</CardTitle>
                          <CardDescription>{business.category}</CardDescription>
                        </CardHeader>
                        {business.description && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {business.description}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Estadísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Reservas Totales</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{bookings.length + pastBookings.length}</div>
                    <p className="text-xs text-muted-foreground">Todas las reservas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Reservas Pendientes</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {bookings.filter((b) => b.status === "reserved").length}
                    </div>
                    <p className="text-xs text-muted-foreground">Aún no iniciadas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Lista de reservas próximas y pasadas */}
              {(bookings.length > 0 || pastBookings.length > 0) && (
                <div className="space-y-6">
                  {/* Desplegable de reservas pasadas */}
                  {pastBookings.length > 0 && (
                    <Collapsible open={pastBookingsOpen} onOpenChange={setPastBookingsOpen}>
                      <Card className="border-muted">
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-xl">Reservas pasadas</CardTitle>
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
                          <CardContent className="pt-0 space-y-4">
                            {pastBookings.map((booking) => {
                              const getBookingStatus = () => {
                                if (booking.status === "no_show") {
                                  return {
                                    label: "No Asistido",
                                    className: "bg-destructive/20 text-destructive border border-destructive"
                                  };
                                }
                                if (booking.status === "completed") {
                                  return {
                                    label: "Completada",
                                    className: "bg-blue-500/20 text-blue-700 border border-blue-500"
                                  };
                                }
                                if (booking.status === "cancelled") {
                                  return {
                                    label: "Cancelada",
                                    className: "bg-gray-500/20 text-gray-700 border border-gray-500"
                                  };
                                }
                                if (booking.status === "occupied" || booking.status === "in_progress") {
                                  return {
                                    label: "En curso",
                                    className: "bg-green-500/20 text-green-700 border border-green-500"
                                  };
                                }
                                if (booking.status === "reserved") {
                                  return {
                                    label: "Pendiente",
                                    className: "bg-orange-500/20 text-orange-700 border border-orange-500"
                                  };
                                }
                                if (booking.status === "pending") {
                                  return {
                                    label: "Retraso",
                                    className: "bg-yellow-500/20 text-yellow-700 border border-yellow-500"
                                  };
                                }
                                return {
                                  label: booking.status,
                                  className: "bg-muted text-muted-foreground"
                                };
                              };

                              const status = getBookingStatus();

                              return (
                                <Card 
                                  key={booking.id}
                                  className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                                  onClick={() => {
                                    setSelectedBooking(booking);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <CardHeader>
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <CardTitle className="text-base">{booking.client_name}</CardTitle>
                                        <CardDescription>
                                          {new Date(booking.booking_date).toLocaleDateString("es-ES", {
                                            weekday: "long",
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                          })}
                                        </CardDescription>
                                      </div>
                                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                                        {status.label}
                                      </span>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                      <div className="flex items-center">
                                        <Clock className="h-4 w-4 mr-2" />
                                        {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                      </div>
                                      <div className="flex items-center">
                                        <Users className="h-4 w-4 mr-2" />
                                        {booking.party_size} {booking.party_size === 1 ? "persona" : "personas"}
                                      </div>
                                      {booking.tables && (
                                        <div className="flex items-center">
                                          <Building2 className="h-4 w-4 mr-2" />
                                          Mesa {booking.tables.table_number}
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </CardContent>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  )}

                  {/* Reservas próximas */}
                  {bookings.length > 0 && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">Reservas Próximas</h2>
                      <div className="space-y-4">
                        {bookings.map((booking) => {
                          const getBookingStatus = () => {
                            if (booking.status === "no_show") {
                              return {
                                label: "No Asistido",
                                className: "bg-destructive/20 text-destructive border border-destructive"
                              };
                            }
                            if (booking.status === "completed") {
                              return {
                                label: "Completada",
                                className: "bg-blue-500/20 text-blue-700 border border-blue-500"
                              };
                            }
                            if (booking.status === "cancelled") {
                              return {
                                label: "Cancelada",
                                className: "bg-gray-500/20 text-gray-700 border border-gray-500"
                              };
                            }
                            if (booking.status === "occupied" || booking.status === "in_progress") {
                              return {
                                label: "En curso",
                                className: "bg-green-500/20 text-green-700 border border-green-500"
                              };
                            }
                            if (booking.status === "reserved") {
                              const now = new Date();
                              const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
                              const delayThreshold = new Date(bookingDateTime.getTime() + 5 * 60 * 1000);

                              if (now >= delayThreshold) {
                                return {
                                  label: "Retraso",
                                  className: "bg-yellow-500/20 text-yellow-700 border border-yellow-500"
                                };
                              }

                              return {
                                label: "Pendiente",
                                className: "bg-orange-500/20 text-orange-700 border border-orange-500"
                              };
                            }
                            if (booking.status === "pending") {
                              return {
                                label: "Retraso",
                                className: "bg-yellow-500/20 text-yellow-700 border border-yellow-500"
                              };
                            }
                            return {
                              label: booking.status,
                              className: "bg-muted text-muted-foreground"
                            };
                          };

                          const status = getBookingStatus();

                          return (
                            <Card 
                              key={booking.id}
                              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
                              onClick={() => {
                                setSelectedBooking(booking);
                                setEditDialogOpen(true);
                              }}
                            >
                              <CardHeader>
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <CardTitle className="text-base">{booking.client_name}</CardTitle>
                                    <CardDescription>
                                      {new Date(booking.booking_date).toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </CardDescription>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.className}`}>
                                    {status.label}
                                  </span>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {booking.start_time.substring(0, 5)} - {booking.end_time.substring(0, 5)}
                                  </div>
                                  <div className="flex items-center">
                                    <Users className="h-4 w-4 mr-2" />
                                    {booking.party_size} {booking.party_size === 1 ? "persona" : "personas"}
                                  </div>
                                  {booking.tables && (
                                    <div className="flex items-center">
                                      <Building2 className="h-4 w-4 mr-2" />
                                      Mesa {booking.tables.table_number}
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal de edición de reserva */}
              {selectedBooking && mainBusiness && (
                <EditBookingDialog
                  booking={selectedBooking}
                  businessId={mainBusiness.id}
                  open={editDialogOpen}
                  onOpenChange={setEditDialogOpen}
                  onBookingUpdated={loadUserData}
                />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vista para clientes (sin cambios)
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            ¡Hola, {profile?.full_name || "Usuario"}!
          </h1>
          <p className="text-muted-foreground text-lg">
            Revisa y gestiona tus reservas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Mis Reservas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-xs text-muted-foreground">Reservas realizadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Próximas</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bookings.filter((b) => new Date(b.booking_date) >= new Date()).length}
              </div>
              <p className="text-xs text-muted-foreground">Reservas pendientes</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Mis Reservas</h2>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No has realizado ninguna reserva</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{booking.businesses.name}</CardTitle>
                        <CardDescription>
                          {new Date(booking.booking_date).toLocaleDateString("es-ES", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === "completed"
                            ? "bg-blue-500/20 text-blue-700 border border-blue-500"
                            : booking.status === "cancelled"
                            ? "bg-gray-500/20 text-gray-700 border border-gray-500"
                            : booking.status === "no_show"
                            ? "bg-destructive/20 text-destructive border border-destructive"
                            : booking.status === "occupied" || booking.status === "in_progress"
                            ? "bg-green-500/20 text-green-700 border border-green-500"
                            : booking.status === "reserved"
                            ? "bg-orange-500/20 text-orange-700 border border-orange-500"
                            : booking.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-700 border border-yellow-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {booking.status === "completed"
                          ? "Completada"
                          : booking.status === "cancelled"
                          ? "Cancelada"
                          : booking.status === "no_show"
                          ? "No Asistido"
                          : booking.status === "occupied" || booking.status === "in_progress"
                          ? "En curso"
                          : booking.status === "reserved"
                          ? "Pendiente"
                          : booking.status === "pending"
                          ? "Retraso"
                          : "Pendiente"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-2" />
                      {booking.start_time} - {booking.end_time}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
