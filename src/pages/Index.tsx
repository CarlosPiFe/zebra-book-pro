import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Clock, MapPin, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import heroImage from "@/assets/hero-bg.jpg";

interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  address: string;
  image_url: string;
}

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(true);

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      // Use secure function that only returns public business information
      // This protects email and phone from being exposed publicly
      const { data, error } = await supabase
        .rpc("get_public_businesses");

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setActiveSearchQuery(searchQuery);
    if (isMobile && searchQuery.trim()) {
      setShowSearchBar(false);
    }
  };

  const handleShowSearchBar = () => {
    setShowSearchBar(true);
    setSearchQuery("");
    setActiveSearchQuery("");
  };

  // En escritorio: filtrar en tiempo real
  // En móvil: solo filtrar cuando activeSearchQuery cambie
  const filteredBusinesses = businesses.filter(
    (business) => {
      const query = isMobile ? activeSearchQuery : searchQuery;
      if (!query) return true;
      
      return business.name.toLowerCase().includes(query.toLowerCase()) ||
        business.category.toLowerCase().includes(query.toLowerCase()) ||
        business.description?.toLowerCase().includes(query.toLowerCase());
    }
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section
        className="relative pt-32 pb-20 px-4 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center text-white mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Reserva tu próxima
              <span className="block text-gradient bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent/70">
                experiencia
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
              La plataforma de reservas más simple y elegante para cualquier negocio
            </p>
          </div>

          {/* Search Bar */}
          {(!isMobile || showSearchBar) && (
            <div className="max-w-2xl mx-auto">
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar restaurantes, peluquerías, gimnasios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch();
                      }
                    }}
                    className="pl-12 pr-4 py-6 text-lg bg-white/95 backdrop-blur-sm border-0 shadow-strong"
                  />
                </div>
                {isMobile && (
                  <Button
                    onClick={handleSearch}
                    size="lg"
                    className="px-6 py-6 bg-accent hover:bg-accent/90 shadow-strong"
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Botón para volver a mostrar el buscador en móvil */}
          {isMobile && !showSearchBar && (
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={handleShowSearchBar}
                variant="outline"
                className="w-full py-6 bg-white/95 backdrop-blur-sm border-0 shadow-strong"
              >
                <Search className="h-5 w-5 mr-2" />
                Nueva búsqueda
              </Button>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
              <Calendar className="h-8 w-8 text-accent mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white mb-1">Reserva fácil</h3>
              <p className="text-white/80">En segundos</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
              <Clock className="h-8 w-8 text-accent mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white mb-1">Disponibilidad</h3>
              <p className="text-white/80">En tiempo real</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-center border border-white/20">
              <Star className="h-8 w-8 text-accent mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white mb-1">Negocios</h3>
              <p className="text-white/80">Verificados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Businesses Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Negocios destacados
            </h2>
            <p className="text-muted-foreground text-lg">
              Descubre los mejores lugares para reservar
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-6">
                    <div className="h-6 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => (
                <Card
                  key={business.id}
                  className="overflow-hidden hover:shadow-strong transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(`/business/${business.id}`)}
                >
                  <div
                    className="h-48 bg-gradient-to-br from-accent/20 to-accent/10 relative overflow-hidden"
                    style={
                      business.image_url
                        ? {
                            backgroundImage: `url(${business.image_url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {}
                    }
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{business.name}</CardTitle>
                      <Badge variant="secondary">{business.category}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {business.description || "Sin descripción"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mr-2" />
                      {business.address || "Sin dirección"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                {searchQuery
                  ? "No se encontraron negocios con esa búsqueda"
                  : "No hay negocios disponibles aún"}
              </p>
            </div>
          )}

          {!loading && businesses.length === 0 && (
            <div className="text-center mt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-accent hover:bg-accent/90"
              >
                ¡Registra tu negocio gratis!
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ¿Tienes un negocio?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Únete a ZebraTime y gestiona todas tus reservas desde un solo lugar
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/auth?mode=signup")}
              className="text-lg px-8"
            >
              Comenzar gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-transparent border-white text-white hover:bg-white/10"
            >
              Ver demo
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
