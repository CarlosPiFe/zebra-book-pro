import { Users, Calendar, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Customer {
  client_name: string;
  client_email: string;
  client_phone: string;
  total_bookings: number;
  last_booking_date: string;
  rating?: number;
}

interface CustomersOverviewProps {
  customers: Customer[];
}

export function CustomersOverview({ customers }: CustomersOverviewProps) {
  const totalBookings = customers.reduce((sum, customer) => sum + customer.total_bookings, 0);
  const avgBookingsPerCustomer = customers.length > 0 
    ? (totalBookings / customers.length).toFixed(1) 
    : 0;
  
  const customersWithRatings = customers.filter(c => c.rating && Number(c.rating) > 0);
  const avgRating = customersWithRatings.length > 0
    ? (customersWithRatings.reduce((sum, c) => sum + Number(c.rating || 0), 0) / customersWithRatings.length).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-2xl font-bold mb-2">Resumen de Clientes</h3>
        <p className="text-muted-foreground">
          Estadísticas generales de tu base de clientes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">
              Clientes registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {avgBookingsPerCustomer} reservas por cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valoración Media</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(avgRating) > 0 ? `${avgRating} ⭐` : "Sin valoraciones"}
            </div>
            <p className="text-xs text-muted-foreground">
              {customersWithRatings.length} clientes valorados
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Clientes Frecuentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {customers
              .sort((a, b) => b.total_bookings - a.total_bookings)
              .slice(0, 5)
              .map((customer, index) => (
                <div key={customer.client_email} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.client_name}</p>
                      <p className="text-xs text-muted-foreground">{customer.client_email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{customer.total_bookings}</p>
                    <p className="text-xs text-muted-foreground">reservas</p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
