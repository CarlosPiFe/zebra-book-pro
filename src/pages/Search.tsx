import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { RestaurantCard } from "@/components/public/RestaurantCard";
import { RestaurantMap } from "@/components/public/RestaurantMap";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Star } from "lucide-react";

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
  const [minRating, setMinRating] = useState<number[]>([3]);
  const [priceRange, setPriceRange] = useState<number[]>([0, 150]);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<string[]>([]);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [expandedCuisines, setExpandedCuisines] = useState(false);
  const [expandedServices, setExpandedServices] = useState(false);

  // Datos de filtros
  const cuisineTypes = [
    "Africano", "Alemán", "Americano", "Andaluz", "Árabe", "Argentino", "Arrocería", 
    "Asador", "Asiático", "Asturiano", "Belga", "Brasileño", "Canario", "Castellano", 
    "Catalán", "Chino", "Colombiano", "Coreano", "Crepería", "Cubano", "De Fusión", 
    "Del Norte", "Ecuatoriano", "Español", "Etíope", "Francés", "Gallego", "Griego", 
    "Indio", "Inglés", "Internacional", "Iraní", "Italiano", "Japonés", "Latino", 
    "Libanés", "Marisquería", "Marroquí", "Mediterráneo", "Mexicano", "Peruano", 
    "Portugués", "Ruso", "Suizo", "Tailandés", "Tradicional", "Turco", "Vasco", 
    "Vegetariano", "Venezolano", "Vietnamita"
  ];
  const serviceTypes = ["Coctelería", "Buffet Libre", "Menú del Día", "Churrería", "Bar de Tapas", "Restaurante", "Brunch"];
  const dishTypes = ["Sushi", "Paella", "Tortilla", "Croquetas", "Ramen", "Pizza"];
  const dietTypes = ["Vegano", "Vegetariano", "Sin Gluten", "Halal", "Kosher"];

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
  }, [businesses, searchLocation, searchType, minRating, priceRange, selectedCuisines, selectedServices, selectedDishes, selectedDiets]);

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

    // Filtro de rating
    const minRatingValue = minRating?.[0] ?? 3;
    if (minRatingValue > 3) {
      filtered = filtered.filter((b) => (b.average_rating || 0) >= minRatingValue);
    }

    // Filtro de precio
    // TODO: Implementar cuando tengamos precios en formato numérico

    // Filtro de tipo de cocina
    if (selectedCuisines.length > 0) {
      filtered = filtered.filter((b) => 
        b.cuisine_type && selectedCuisines.includes(b.cuisine_type)
      );
    }

    // TODO: Filtros de servicio, platos y dietas cuando estén en la BD

    setFilteredBusinesses(filtered);
  };

  const handleBusinessClick = (businessId: string) => {
    navigate(`/business/${businessId}`);
  };

  const resetFilters = () => {
    setMinRating([3]);
    setPriceRange([0, 150]);
    setSelectedCuisines([]);
    setSelectedServices([]);
    setSelectedDishes([]);
    setSelectedDiets([]);
  };

  const toggleCheckbox = (value: string, selected: string[], setter: (val: string[]) => void) => {
    if (selected.includes(value)) {
      setter(selected.filter(v => v !== value));
    } else {
      setter([...selected, value]);
    }
  };

  const getRatingLabel = (value: number) => {
    if (value === 3) return "Cualquier valoración";
    return `${value} estrellas o más`;
  };

  const getPriceLabel = () => {
    const [min, max] = priceRange;
    if (min === 0 && max === 150) return "Cualquier precio";
    if (max === 150) return `€${min} - €${max}+`;
    return `€${min} - €${max}`;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if ((minRating?.[0] ?? 3) > 3) count++;
    if ((priceRange?.[0] ?? 0) > 0 || (priceRange?.[1] ?? 150) < 150) count++;
    count += selectedCuisines.length;
    count += selectedServices.length;
    count += selectedDishes.length;
    count += selectedDiets.length;
    return count;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-20">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Columna 1: Filtros */}
            <aside className="lg:col-span-1 lg:sticky top-20 h-fit">
              <div className="bg-card rounded-lg border p-4 space-y-4">
                {/* Filtros Aplicados */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="applied-filters" className="border-none">
                    <AccordionTrigger className="text-sm font-semibold hover:no-underline py-2">
                      Filtros Aplicados {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
                    </AccordionTrigger>
                    <AccordionContent>
                      {getActiveFiltersCount() === 0 ? (
                        <p className="text-xs text-muted-foreground">No se ha aplicado ningún filtro.</p>
                      ) : (
                        <div className="space-y-2">
                          {(minRating?.[0] ?? 3) > 3 && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Valoración: {minRating[0]}+</span>
                              <Button variant="ghost" size="sm" className="h-5 px-2" onClick={() => setMinRating([3])}>×</Button>
                            </div>
                          )}
                          {((priceRange?.[0] ?? 0) > 0 || (priceRange?.[1] ?? 150) < 150) && (
                            <div className="flex items-center justify-between text-xs">
                              <span>Precio: {getPriceLabel()}</span>
                              <Button variant="ghost" size="sm" className="h-5 px-2" onClick={() => setPriceRange([0, 150])}>×</Button>
                            </div>
                          )}
                          {[...selectedCuisines, ...selectedServices, ...selectedDishes, ...selectedDiets].map((filter) => (
                            <div key={filter} className="flex items-center justify-between text-xs">
                              <span>{filter}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 px-2"
                                onClick={() => {
                                  if (selectedCuisines.includes(filter)) setSelectedCuisines(selectedCuisines.filter(c => c !== filter));
                                  if (selectedServices.includes(filter)) setSelectedServices(selectedServices.filter(s => s !== filter));
                                  if (selectedDishes.includes(filter)) setSelectedDishes(selectedDishes.filter(d => d !== filter));
                                  if (selectedDiets.includes(filter)) setSelectedDiets(selectedDiets.filter(d => d !== filter));
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Separator className="my-4" />

                {/* Valoración Mínima */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Valoración Mínima</Label>
                  <Slider
                    value={minRating}
                    onValueChange={setMinRating}
                    min={3}
                    max={5}
                    step={0.5}
                    className="py-2"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{getRatingLabel(minRating?.[0] ?? 3)}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Precio Medio */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Precio Medio</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={150}
                    step={5}
                    className="py-2"
                  />
                  <p className="text-xs text-muted-foreground">{getPriceLabel()}</p>
                </div>

                <Separator className="my-4" />

                {/* Tipo de Cocina */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tipo de Cocina</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {cuisineTypes.slice(0, expandedCuisines ? cuisineTypes.length : 6).map((cuisine) => (
                      <div key={cuisine} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cuisine-${cuisine}`}
                          checked={selectedCuisines.includes(cuisine)}
                          onCheckedChange={() => toggleCheckbox(cuisine, selectedCuisines, setSelectedCuisines)}
                        />
                        <Label htmlFor={`cuisine-${cuisine}`} className="text-xs cursor-pointer">
                          {cuisine}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {cuisineTypes.length > 6 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => setExpandedCuisines(!expandedCuisines)}
                    >
                      {expandedCuisines ? "Ver menos" : "Ver más..."}
                    </Button>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Tipo de Servicio */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Tipo de Servicio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {serviceTypes.slice(0, expandedServices ? serviceTypes.length : 6).map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={selectedServices.includes(service)}
                          onCheckedChange={() => toggleCheckbox(service, selectedServices, setSelectedServices)}
                        />
                        <Label htmlFor={`service-${service}`} className="text-xs cursor-pointer">
                          {service}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {serviceTypes.length > 6 && (
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-xs"
                      onClick={() => setExpandedServices(!expandedServices)}
                    >
                      {expandedServices ? "Ver menos" : "Ver más..."}
                    </Button>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Platos */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Platos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dishTypes.map((dish) => (
                      <div key={dish} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dish-${dish}`}
                          checked={selectedDishes.includes(dish)}
                          onCheckedChange={() => toggleCheckbox(dish, selectedDishes, setSelectedDishes)}
                        />
                        <Label htmlFor={`dish-${dish}`} className="text-xs cursor-pointer">
                          {dish}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Dietas */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Dietas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dietTypes.map((diet) => (
                      <div key={diet} className="flex items-center space-x-2">
                        <Checkbox
                          id={`diet-${diet}`}
                          checked={selectedDiets.includes(diet)}
                          onCheckedChange={() => toggleCheckbox(diet, selectedDiets, setSelectedDiets)}
                        />
                        <Label htmlFor={`diet-${diet}`} className="text-xs cursor-pointer">
                          {diet}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botón Limpiar Filtros */}
                {getActiveFiltersCount() > 0 && (
                  <>
                    <Separator className="my-4" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={resetFilters}
                    >
                      Limpiar todos los filtros
                    </Button>
                  </>
                )}
              </div>
            </aside>

            {/* Columna 2: Tarjetas de Restaurantes */}
            <main className="lg:col-span-2">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                </div>
              ) : filteredBusinesses.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground text-center">
                    No se encontraron restaurantes con estos filtros.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredBusinesses.map((business) => (
                    <div
                      key={business.id}
                      className="cursor-pointer hover:bg-accent/50 rounded-lg p-2 transition-colors"
                      onClick={() => handleBusinessClick(business.id)}
                    >
                      <RestaurantCard business={business} />
                    </div>
                  ))}
                </div>
              )}
            </main>

            {/* Columna 3: Mapa */}
            <aside className="hidden lg:block lg:col-span-2 lg:sticky top-20 h-fit">
              <div className="h-[calc(100vh-7rem)] rounded-lg overflow-hidden border">
                <RestaurantMap 
                  businesses={filteredBusinesses}
                  onBusinessClick={handleBusinessClick}
                />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}