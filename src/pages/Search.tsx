import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/public/Footer";
import { RestaurantCard } from "@/components/public/RestaurantCard";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number[]>([0]);

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [businesses, searchQuery, priceFilter, categoryFilter, ratingFilter]);

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

    // Filtro de búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.category?.toLowerCase().includes(query) ||
          b.address?.toLowerCase().includes(query)
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
    const minRating = ratingFilter?.[0] ?? 0;
    if (minRating > 0) {
      filtered = filtered.filter((b) => (b.average_rating || 0) >= minRating);
    }

    setFilteredBusinesses(filtered);
  };

  // Obtener categorías únicas
  const categories = Array.from(new Set(businesses.map((b) => b.category)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Buscar Restaurantes</h1>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, tipo de cocina o ubicación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filtros */}
            <aside className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Precio */}
                  <div className="space-y-2">
                    <Label>Rango de Precio</Label>
                    <Select value={priceFilter} onValueChange={setPriceFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="€">€ - Económico</SelectItem>
                        <SelectItem value="€€">€€ - Moderado</SelectItem>
                        <SelectItem value="€€€">€€€ - Caro</SelectItem>
                        <SelectItem value="€€€€">€€€€ - Muy Caro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Categoría */}
                  <div className="space-y-2">
                    <Label>Tipo de Cocina</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas" />
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
                  </div>

                  {/* Rating */}
                  <div className="space-y-2">
                    <Label>Valoración Mínima: {ratingFilter?.[0] ?? 0}/10</Label>
                    <Slider
                      value={ratingFilter}
                      onValueChange={setRatingFilter}
                      max={10}
                      step={1}
                      className="py-4"
                    />
                  </div>
                </CardContent>
              </Card>
            </aside>

            {/* Resultados */}
            <div className="lg:col-span-3">
              {loading ? (
                <LoadingSpinner />
              ) : filteredBusinesses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No se encontraron restaurantes con estos filtros.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {filteredBusinesses.length} restaurante
                    {filteredBusinesses.length !== 1 ? "s" : ""} encontrado
                    {filteredBusinesses.length !== 1 ? "s" : ""}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredBusinesses.map((business) => (
                      <RestaurantCard key={business.id} business={business} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}