import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { RestaurantCard } from "@/components/public/RestaurantCard";
import { RestaurantMap } from "@/components/public/RestaurantMap";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Percent, Utensils, Euro, Star, ChevronRight } from "lucide-react";

interface Business {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  address?: string | null;
  image_url?: string | null;
  price_range?: string | null;
  average_rating?: number | null;
  special_offer?: string | null;
}

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [location] = useState(searchParams.get("location") || "");
  const [restaurantType] = useState(searchParams.get("type") || "");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("relevance");
  
  // Filtros rápidos tipo "pills"
  const [showOffers, setShowOffers] = useState(false);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [businesses, location, restaurantType, priceFilter, categoryFilter, minRating, showOffers, sortBy]);

  const loadBusinesses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error loading businesses:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...businesses];

    // Filtro de ubicación
    if (location) {
      const loc = location.toLowerCase();
      filtered = filtered.filter(
        (b) => b.address?.toLowerCase().includes(loc)
      );
    }

    // Filtro de tipo de restaurante
    if (restaurantType) {
      const type = restaurantType.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(type) ||
          b.category?.toLowerCase().includes(type)
      );
    }

    // Filtro de precio
    if (priceFilter !== "all") {
      filtered = filtered.filter((b) => b.price_range === priceFilter);
    }

    // Filtro de categoría
    if (categoryFilter !== "all") {
      filtered = filtered.filter((b) => b.category === categoryFilter);
    }

    // Filtro de rating
    if (minRating > 0) {
      filtered = filtered.filter((b) => (b.average_rating || 0) >= minRating);
    }

    // Filtro de ofertas
    if (showOffers) {
      filtered = filtered.filter((b) => b.special_offer);
    }

    // Ordenar resultados
    if (sortBy === "rating") {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === "price_low") {
      filtered.sort((a, b) => {
        const priceOrder = { "€": 1, "€€": 2, "€€€": 3, "€€€€": 4 };
        return (priceOrder[a.price_range as keyof typeof priceOrder] || 0) - 
               (priceOrder[b.price_range as keyof typeof priceOrder] || 0);
      });
    } else if (sortBy === "price_high") {
      filtered.sort((a, b) => {
        const priceOrder = { "€": 1, "€€": 2, "€€€": 3, "€€€€": 4 };
        return (priceOrder[b.price_range as keyof typeof priceOrder] || 0) - 
               (priceOrder[a.price_range as keyof typeof priceOrder] || 0);
      });
    }

    setFilteredBusinesses(filtered);
  };

  const handleBusinessClick = (businessId: string) => {
    navigate(`/business/${businessId}`);
  };

  const resetFilters = () => {
    setPriceFilter("all");
    setCategoryFilter("all");
    setMinRating(0);
    setShowOffers(false);
    setSortBy("relevance");
  };

  // Obtener categorías únicas
  const categories = Array.from(new Set(businesses.map((b) => b.category)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <div className="flex h-[calc(100vh-4rem)]">
          {/* Columna Izquierda - Resultados (40%) */}
          <div className="w-full lg:w-[40%] flex flex-col overflow-hidden border-r">
            {/* Breadcrumbs y Header */}
            <div className="p-6 border-b space-y-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>Búsqueda</BreadcrumbPage>
                  </BreadcrumbItem>
                  {location && (
                    <>
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-4 w-4" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        <BreadcrumbPage>{location}</BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  )}
                </BreadcrumbList>
              </Breadcrumb>

              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    {location ? `Restaurantes en ${location}` : "Todos los Restaurantes"}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {filteredBusinesses.length} restaurante{filteredBusinesses.length !== 1 ? "s" : ""} encontrado{filteredBusinesses.length !== 1 ? "s" : ""}
                  </p>
                </div>
                
                {/* Ordenación */}
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Ordenar por:</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevancia</SelectItem>
                      <SelectItem value="rating">Valoración</SelectItem>
                      <SelectItem value="price_low">Precio (bajo)</SelectItem>
                      <SelectItem value="price_high">Precio (alto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filtros Rápidos (Pills) */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={showOffers ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOffers(!showOffers)}
                  className="flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Percent className="h-4 w-4" />
                  Ofertas
                </Button>
                
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-auto min-w-[120px] h-9">
                    <Utensils className="h-4 w-4 mr-1.5" />
                    <SelectValue placeholder="Tipo de Cocina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={setPriceFilter}>
                  <SelectTrigger className="w-auto min-w-[100px] h-9">
                    <Euro className="h-4 w-4 mr-1.5" />
                    <SelectValue placeholder="Precio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="€">€</SelectItem>
                    <SelectItem value="€€">€€</SelectItem>
                    <SelectItem value="€€€">€€€</SelectItem>
                    <SelectItem value="€€€€">€€€€</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={minRating.toString()} onValueChange={(v) => setMinRating(Number(v))}>
                  <SelectTrigger className="w-auto min-w-[120px] h-9">
                    <Star className="h-4 w-4 mr-1.5" />
                    <SelectValue placeholder="Valoración" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Todas</SelectItem>
                    <SelectItem value="7">7+ estrellas</SelectItem>
                    <SelectItem value="8">8+ estrellas</SelectItem>
                    <SelectItem value="9">9+ estrellas</SelectItem>
                  </SelectContent>
                </Select>

                {(showOffers || categoryFilter !== "all" || priceFilter !== "all" || minRating > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="whitespace-nowrap"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>

            {/* Lista de Restaurantes */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-muted-foreground text-lg mb-2">
                    No se encontraron restaurantes
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBusinesses.map((business) => (
                    <div key={business.id}>
                      <RestaurantCard 
                        business={business}
                        onClick={() => handleBusinessClick(business.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha - Mapa Sticky (60%) */}
          <div className="hidden lg:block lg:w-[60%] sticky top-16 h-[calc(100vh-4rem)]">
            <RestaurantMap 
              businesses={filteredBusinesses}
              onBusinessClick={handleBusinessClick}
            />
          </div>
        </div>
      </main>
    </div>
  );
}