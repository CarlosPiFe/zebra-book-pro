import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { RestaurantCard } from "@/components/public/RestaurantCard";
import { RestaurantMap } from "@/components/public/RestaurantMap";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
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

  // Parámetros de búsqueda
  const [searchLocation, setSearchLocation] = useState<string>("");
  const [searchType, setSearchType] = useState<string>("");

  // Filtros
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number[]>([0]);

  useEffect(() => {
    // Leer parámetros de la URL al cargar
    const location = searchParams.get('location') || "";
    const type = searchParams.get('type') || "";
    setSearchLocation(location);
    setSearchType(type);
    loadBusinesses();
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [businesses, searchLocation, searchType, priceFilter, cuisineFilter, ratingFilter]);

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
    if (searchLocation) {
      const loc = searchLocation.toLowerCase();
      filtered = filtered.filter(
        (b) => b.address?.toLowerCase().includes(loc)
      );
    }

    // Filtro de tipo de restaurante
    if (searchType) {
      const type = searchType.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(type) ||
          b.cuisine_type?.toLowerCase().includes(type) ||
          b.description?.toLowerCase().includes(type)
      );
    }

    // Filtro de precio
    if (priceFilter !== "all") {
      filtered = filtered.filter((b) => b.price_range === priceFilter);
    }

    // Filtro de tipo de cocina
    if (cuisineFilter !== "all") {
      filtered = filtered.filter((b) => b.cuisine_type === cuisineFilter);
    }

    // Filtro de rating
    const minRating = ratingFilter?.[0] ?? 0;
    if (minRating > 0) {
      filtered = filtered.filter((b) => (b.average_rating || 0) >= minRating);
    }

    setFilteredBusinesses(filtered);
  };

  const handleBusinessClick = (businessId: string) => {
    navigate(`/business/${businessId}`);
  };

  const resetFilters = () => {
    setPriceFilter("all");
    setCuisineFilter("all");
    setRatingFilter([0]);
  };

  // Obtener tipos de cocina únicos
  const cuisineTypes = Array.from(new Set(businesses.map((b) => b.cuisine_type).filter(Boolean)));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        <div className="h-[calc(100vh-5rem)] flex">
          {/* Panel Izquierdo - Lista y Filtros */}
          <div className="w-full lg:w-2/5 flex flex-col overflow-hidden border-r">
            {/* Header con info de búsqueda */}
            <div className="p-3 border-b bg-card">
              <div className="space-y-1">
                {searchLocation && (
                  <p className="text-xs text-muted-foreground">
                    📍 <span className="font-medium text-foreground">{searchLocation}</span>
                  </p>
                )}
                {searchType && (
                  <p className="text-xs text-muted-foreground">
                    🍽️ <span className="font-medium text-foreground">{searchType}</span>
                  </p>
                )}
                <p className="text-base font-bold">
                  {filteredBusinesses.length} restaurante{filteredBusinesses.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Filtros */}
            <div className="p-3 border-b bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Filtros</h3>
                <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
                  Limpiar
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Precio */}
                <div className="space-y-1">
                  <Label className="text-xs">Precio</Label>
                  <Select value={priceFilter} onValueChange={setPriceFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="€">€</SelectItem>
                      <SelectItem value="€€">€€</SelectItem>
                      <SelectItem value="€€€">€€€</SelectItem>
                      <SelectItem value="€€€€">€€€€</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Categoría */}
                <div className="space-y-1">
                  <Label className="text-xs">Cocina</Label>
                  <Select value={cuisineFilter} onValueChange={setCuisineFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {cuisineTypes.map((cuisine) => (
                        <SelectItem key={cuisine} value={cuisine!}>
                          {cuisine}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label className="text-xs">Valoración mínima: {ratingFilter?.[0] ?? 0}/10</Label>
                <Slider
                  value={ratingFilter}
                  onValueChange={setRatingFilter}
                  max={10}
                  step={1}
                  className="py-2"
                />
              </div>
            </div>

            {/* Lista de Resultados */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-center text-sm">
                    No se encontraron restaurantes con estos filtros.
                  </p>
                </div>
              ) : (
                filteredBusinesses.map((business) => (
                  <div
                    key={business.id}
                    className="cursor-pointer hover:bg-accent/50 rounded-lg p-2 transition-colors"
                    onClick={() => handleBusinessClick(business.id)}
                  >
                    <RestaurantCard business={business} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel Derecho - Mapa */}
          <div className="hidden lg:block lg:w-3/5 relative">
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