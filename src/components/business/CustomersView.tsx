import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Star, UserPlus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CustomersOverview } from "./CustomersOverview";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Customer {
  client_name: string;
  client_email: string;
  client_phone: string;
  total_bookings: number;
  last_booking_date: string;
  rating?: number;
}

interface CustomersViewProps {
  businessId: string;
}

export function CustomersView({ businessId }: CustomersViewProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
  }, [businessId]);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      // Get unique customers from bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("client_name, client_email, client_phone, booking_date")
        .eq("business_id", businessId)
        .not("client_email", "is", null)
        .order("booking_date", { ascending: false });

      if (bookingsError) throw bookingsError;

      // Process data to get unique customers with stats
      const customerMap = new Map<string, Customer>();

      (bookingsData || []).forEach((booking) => {
        const email = booking.client_email;
        if (!email) return;

        if (customerMap.has(email)) {
          const existing = customerMap.get(email)!;
          existing.total_bookings++;
          // Update last booking date if newer
          if (booking.booking_date > existing.last_booking_date) {
            existing.last_booking_date = booking.booking_date;
          }
        } else {
          customerMap.set(email, {
            client_name: booking.client_name,
            client_email: email,
            client_phone: booking.client_phone || "",
            total_bookings: 1,
            last_booking_date: booking.booking_date,
          });
        }
      });

      const uniqueCustomers = Array.from(customerMap.values());

      // Load ratings for customers
      const { data: notesData, error: notesError } = await supabase
        .from("customer_notes")
        .select("client_email, rating")
        .eq("business_id", businessId);

      if (notesError) throw notesError;

      // Merge ratings with customer data
      const notesMap = new Map(
        (notesData || []).map((note) => [note.client_email, note.rating || undefined])
      );

      uniqueCustomers.forEach((customer) => {
        customer.rating = notesMap.get(customer.client_email);
      });

      // Sort by last booking date (most recent first)
      uniqueCustomers.sort(
        (a, b) =>
          new Date(b.last_booking_date).getTime() -
          new Date(a.last_booking_date).getTime()
      );

      setCustomers(uniqueCustomers);
      setFilteredCustomers(uniqueCustomers);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast.error("Error al cargar los clientes");
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      (customer) =>
        customer.client_name.toLowerCase().includes(query) ||
        customer.client_email.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const handleCustomerClick = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {customers.length === 0 ? (
        <Card className="p-8 text-center">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay clientes</h3>
          <p className="text-muted-foreground mb-4">
            Cuando recibas reservas, los clientes aparecerán aquí
          </p>
        </Card>
      ) : (
        <div className="flex gap-6 h-full overflow-hidden min-h-0">
          {/* Customer List - Left Column */}
          <div className="w-80 flex-shrink-0 flex flex-col">
            {/* Search Bar */}
            <div className="relative mb-4 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="h-full overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {filteredCustomers.length === 0 ? (
                <Card className="p-6">
                  <p className="text-center text-muted-foreground text-sm">
                    No se encontraron clientes
                  </p>
                </Card>
              ) : (
                filteredCustomers.map((customer) => (
                  <Card
                    key={customer.client_email}
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-md flex-shrink-0",
                      selectedCustomer?.client_email === customer.client_email
                        ? "ring-2 ring-primary bg-accent/50"
                        : "hover:bg-accent/50"
                    )}
                    onClick={() => handleCustomerClick(customer)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback>{getInitials(customer.client_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{customer.client_name}</h3>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">
                            {customer.total_bookings} reservas
                          </span>
                          {customer.rating && customer.rating > 0 && (
                            <div className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs">{customer.rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Customer Detail - Right Column */}
          <div className="flex-1 min-w-0 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {selectedCustomer ? (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{selectedCustomer.client_name}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total Reservas</p>
                      <p className="text-2xl font-bold">{selectedCustomer.total_bookings}</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Última Visita</p>
                      <p className="text-lg font-semibold">
                        {format(
                          parse(selectedCustomer.last_booking_date, "yyyy-MM-dd", new Date()),
                          "d MMM yyyy",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  </Card>
                  <Card>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">Valoración</p>
                      {selectedCustomer.rating && selectedCustomer.rating > 0 ? (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: selectedCustomer.rating }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-5 w-5 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Sin valoración</p>
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            ) : (
              <CustomersOverview customers={customers} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
