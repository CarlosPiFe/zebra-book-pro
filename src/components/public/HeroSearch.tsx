import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Utensils } from "lucide-react";

export const HeroSearch = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [restaurantType, setRestaurantType] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.append("location", location);
    if (restaurantType) params.append("type", restaurantType);
    
    const queryStr = params.toString();
    navigate(queryStr ? `/search?${queryStr}` : "/search");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="bg-card rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              Busca y reserva los mejores restaurantes
            </h1>
            <p className="text-lg text-muted-foreground">
              Descubre cerca de ti
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Ubicación"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-14 pl-11 text-base"
              />
            </div>
            
            <div className="relative">
              <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Tipo de cocina o restaurante"
                value={restaurantType}
                onChange={(e) => setRestaurantType(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-14 pl-11 text-base"
              />
            </div>
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold"
            onClick={handleSearch}
          >
            <Search className="h-5 w-5 mr-2" />
            Buscar
          </Button>
        </div>
      </div>
    </div>
  );
};