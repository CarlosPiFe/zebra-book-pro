import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      navigate("/search");
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-search-query', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      const params = new URLSearchParams();
      if (data.location) params.append('location', data.location);
      if (data.cuisine) params.append('type', data.cuisine);
      if (data.keywords) params.append('q', data.keywords);
      
      // Añadir filtros de dietas
      if (data.dietaryOptions && data.dietaryOptions.length > 0) {
        data.dietaryOptions.forEach((diet: string) => params.append('diet', diet));
      }
      
      // Añadir filtros de servicios
      if (data.serviceTypes && data.serviceTypes.length > 0) {
        data.serviceTypes.forEach((service: string) => params.append('service', service));
      }
      
      // Añadir filtros de platos
      if (data.dishSpecialties && data.dishSpecialties.length > 0) {
        data.dishSpecialties.forEach((dish: string) => params.append('dish', dish));
      }
      
      navigate(`/search?${params.toString()}`);
    } catch (error) {
      console.error('Error al interpretar búsqueda:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo interpretar tu búsqueda. Intenta de nuevo.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };
  return (
    <div className="w-full py-12 px-4 bg-primary" id="hero-search">
      <div className="container mx-auto max-w-4xl space-y-5">
        <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl tracking-tight text-foreground text-left font-bold md:text-4xl">
              Reserva tu mesa en segundos
            </h1>
            <p className="text-base text-muted-foreground text-left">
              Descubre los mejores restaurantes de tu zona
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary z-10" />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
              <Input 
                placeholder='Prueba "sushi barato en Madrid centro" o "italiana romántica"' 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className="h-12 pl-11 pr-11 text-sm border-input"
              />
            </div>
            <Button 
              size="default" 
              className="h-12 px-8 text-sm font-semibold" 
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? "BUSCANDO..." : "BUSCAR"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};