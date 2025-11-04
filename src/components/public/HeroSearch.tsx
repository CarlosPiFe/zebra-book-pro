import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

export const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    navigate(searchQuery ? `/search?query=${encodeURIComponent(searchQuery)}` : "/search");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full py-12 px-4 bg-primary" id="hero-search">
      <div className="container mx-auto max-w-4xl space-y-5">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Busca y reserva los mejores restaurantes
            </h1>
            <p className="text-base text-muted-foreground">
              Descubre cerca de ti
            </p>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tipo de cocina, nombre del restaurante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-12 pl-11 pr-10 text-sm"
              />
            </div>
            <Button
              size="default"
              className="h-12 px-8 text-sm font-semibold"
              onClick={handleSearch}
            >
              BÚSQUEDA
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};