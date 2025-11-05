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
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-5 pb-5">
                <CalendarCheck className="h-10 w-10 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-base mb-1">Reservas Fáciles</h3>
                <p className="text-xs text-muted-foreground">
                  Reserva en segundos, sin llamadas ni esperas
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-5">
                <Clock className="h-10 w-10 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-base mb-1">Disponibilidad Real</h3>
                <p className="text-xs text-muted-foreground">
                  Mesas actualizadas en tiempo real
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-5 pb-5">
                <ShieldCheck className="h-10 w-10 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold text-base mb-1">Negocios Verificados</h3>
                <p className="text-xs text-muted-foreground">
                  Todos los restaurantes están verificados
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Restaurant Carousels */}
        <div className="space-y-12 py-6">
          <RestaurantCarousel title="Ofertas y descuentos" filter="offers" />
          <RestaurantCarousel title="Los más reservados" filter="featured" />
          <RestaurantCarousel title="Novedades en ZebraTime" filter="newest" />
          <RestaurantCarousel title="Descubre más restaurantes" filter="all" />
        </div>

        {/* CTA for Business Owners */}
        <div className="bg-primary/10 py-12 mt-12">
          <div className="container mx-auto px-4 text-center space-y-4 max-w-7xl">
            <h2 className="text-2xl md:text-3xl font-bold">
              ¿Tienes un restaurante?
            </h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Únete a ZebraTime y comienza a recibir reservas online. 
              Gestiona tu negocio de forma profesional y sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
              <a
                href="/create-business"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6"
              >
                Registrar mi negocio
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-primary hover:text-primary-foreground h-10 px-6"
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