import { Navbar } from "@/components/Navbar";
import { HeroSearch } from "@/components/public/HeroSearch";
import { RestaurantCarousel } from "@/components/public/RestaurantCarousel";
import { Footer } from "@/components/public/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Clock, ShieldCheck } from "lucide-react";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        {/* Hero Search Section */}
        <HeroSearch />

        {/* Quick Stats */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <CalendarCheck className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="font-semibold text-lg mb-2">Reservas Fáciles</h3>
                <p className="text-sm text-muted-foreground">
                  Reserva en segundos, sin llamadas ni esperas
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <Clock className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="font-semibold text-lg mb-2">Disponibilidad Real</h3>
                <p className="text-sm text-muted-foreground">
                  Mesas actualizadas en tiempo real
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-accent" />
                <h3 className="font-semibold text-lg mb-2">Negocios Verificados</h3>
                <p className="text-sm text-muted-foreground">
                  Todos los restaurantes están verificados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Restaurant Carousels */}
        <div className="container mx-auto px-4 space-y-12 py-8">
          <RestaurantCarousel title="Ofertas y descuentos" filter="offers" />
          <RestaurantCarousel title="Los más reservados" filter="featured" />
          <RestaurantCarousel title="Novedades en ZebraTime" filter="newest" />
          <RestaurantCarousel title="Descubre más restaurantes" filter="all" />
        </div>

        {/* CTA for Business Owners */}
        <div className="bg-accent/10 py-16 mt-16">
          <div className="container mx-auto px-4 text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold">
              ¿Tienes un restaurante?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Únete a ZebraTime y comienza a recibir reservas online. 
              Gestiona tu negocio de forma profesional y sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <a
                href="/create-business"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-accent text-accent-foreground hover:bg-accent/90 h-11 px-8"
              >
                Registrar mi negocio
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8"
              >
                Acceder a mi negocio
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}