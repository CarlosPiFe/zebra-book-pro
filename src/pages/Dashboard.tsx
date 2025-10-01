import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Building2, Users, Clock } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "client";
}

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  businesses: {
    name: string;
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

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

      // Load data based on role
      if (profileData.role === "owner") {
        const { data: businessData } = await supabase
          .from("businesses")
          .select("*")
          .eq("owner_id", session.user.id);
        
        setBusinesses(businessData || []);

        // Load bookings for owner's businesses
        if (businessData && businessData.length > 0) {
          const businessIds = businessData.map((b) => b.id);
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("*, businesses(name)")
            .in("business_id", businessIds)
            .order("booking_date", { ascending: true });
          
          setBookings(bookingData || []);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            ¡Hola, {profile?.full_name || "Usuario"}!
          </h1>
          <p className="text-muted-foreground text-lg">
            {profile?.role === "owner"
              ? "Gestiona tus negocios y reservas"
              : "Revisa y gestiona tus reservas"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {profile?.role === "owner" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mis Negocios</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{businesses.length}</div>
                <p className="text-xs text-muted-foreground">Negocios activos</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {profile?.role === "owner" ? "Total Reservas" : "Mis Reservas"}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bookings.length}</div>
              <p className="text-xs text-muted-foreground">
                {profile?.role === "owner" ? "Reservas recibidas" : "Reservas realizadas"}
              </p>
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

        {/* Content Tabs */}
        <Tabs defaultValue={profile?.role === "owner" ? "businesses" : "bookings"} className="space-y-4">
          {profile?.role === "owner" && (
            <>
              <TabsList>
                <TabsTrigger value="businesses">Negocios</TabsTrigger>
                <TabsTrigger value="bookings">Reservas</TabsTrigger>
              </TabsList>

              <TabsContent value="businesses" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Mis Negocios</h2>
                  <Button
                    onClick={() => navigate("/business/create")}
                    className="bg-accent hover:bg-accent/90"
                  >
                    Crear Negocio
                  </Button>
                </div>

                {businesses.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center py-12">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Aún no tienes negocios registrados
                      </p>
                      <Button
                        onClick={() => navigate("/business/create")}
                        className="bg-accent hover:bg-accent/90"
                      >
                        Crear tu primer negocio
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businesses.map((business) => (
                      <Card
                        key={business.id}
                        className="cursor-pointer hover:shadow-medium transition-shadow"
                        onClick={() => navigate(`/business/${business.id}/manage`)}
                      >
                        <CardHeader>
                          <CardTitle>{business.name}</CardTitle>
                          <CardDescription>{business.category}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {business.description || "Sin descripción"}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}

          <TabsContent value="bookings" className="space-y-4">
            <h2 className="text-2xl font-bold">
              {profile?.role === "owner" ? "Reservas Recibidas" : "Mis Reservas"}
            </h2>

            {bookings.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {profile?.role === "owner"
                      ? "No tienes reservas aún"
                      : "No has realizado ninguna reserva"}
                  </p>
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
                            booking.status === "confirmed"
                              ? "bg-accent/10 text-accent"
                              : booking.status === "cancelled"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {booking.status === "confirmed"
                            ? "Confirmada"
                            : booking.status === "cancelled"
                            ? "Cancelada"
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
