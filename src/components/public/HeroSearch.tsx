import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Search } from "lucide-react";
export const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState("");
  const [searchType, setSearchType] = useState("");
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.append('location', searchLocation);
    if (searchType) params.append('type', searchType);
    navigate(params.toString() ? `/search?${params.toString()}` : "/search");
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  return <div className="w-full py-12 px-4 bg-primary" id="hero-search">
      <div className="container mx-auto max-w-4xl space-y-5">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl tracking-tight text-foreground text-left font-bold md:text-4xl">
              Reserva tu próxima mesa en segundos
            </h1>
            <p className="text-base text-muted-foreground text-left">
              Descubre los mejores restaurantes de tu zona
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-background border border-input rounded-md h-12 overflow-hidden">
              <div className="relative flex-[0.35]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input placeholder="Ubicación" value={searchLocation} onChange={e => setSearchLocation(e.target.value)} onKeyPress={handleKeyPress} className="h-full border-0 pl-11 pr-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" />
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="relative flex-[0.65]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Tipo de cocina, restaurante..." value={searchType} onChange={e => setSearchType(e.target.value)} onKeyPress={handleKeyPress} className="h-full border-0 pl-10 pr-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" />
              </div>
            </div>
            <Button size="default" className="h-12 px-8 text-sm font-semibold" onClick={handleSearch}>
              BUSCAR
            </Button>
          </div>
        </div>
      </div>
    </div>;
};