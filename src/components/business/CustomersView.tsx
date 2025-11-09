import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Calendar, Star } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CustomerDetailSheet } from "./CustomerDetailSheet";
import { format, parse } from "date-fns";
import { es } from "date-fns/locale";
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
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

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
        (notesData || []).map((note) => [note.client_email, note.rating])
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
    setDetailSheetOpen(true);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Clientes ({customers.length})</h2>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o correo electrónico..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              {customers.length === 0 ? (
                <>
                  <p className="text-lg font-medium mb-2">
                    Aún no tienes clientes registrados
                  </p>
                  <p className="text-sm">
                    Cuando recibas reservas, aparecerán aquí
                  </p>
                </>
              ) : (
                <p>No se encontraron clientes con ese criterio de búsqueda</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.client_email}
              className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50"
              onClick={() => handleCustomerClick(customer)}
            >
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg truncate">
                    {customer.client_name}
                  </h3>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.client_email}</span>
                  </div>

                  {customer.client_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{customer.client_phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reservas:</span>
                    <span className="font-medium">{customer.total_bookings}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <Calendar className="inline h-3 w-3 mr-1" />
                      Última visita:
                    </span>
                    <span className="font-medium text-xs">
                      {format(
                        parse(customer.last_booking_date, "yyyy-MM-dd", new Date()),
                        "d MMM yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>

                  {customer.rating && customer.rating > 0 && (
                    <div className="flex items-center gap-1 pt-2">
                      {Array.from({ length: customer.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CustomerDetailSheet
        customer={selectedCustomer}
        businessId={businessId}
        open={detailSheetOpen}
        onOpenChange={(open) => {
          setDetailSheetOpen(open);
          if (!open) {
            // Reload customers when closing to refresh ratings
            loadCustomers();
          }
        }}
      />
    </div>
  );
}
