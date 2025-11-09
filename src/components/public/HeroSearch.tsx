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
      const { data, error } = await supabase.functions.invoke('intelligent-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      // La IA ya devuelve los resultados filtrados y validados
      const params = new URLSearchParams();
      
      // Añadir filtros aplicados por la IA
      const filters = data.appliedFilters;
      if (filters.location) params.append('location', filters.location);
      if (filters.cuisine) params.append('cuisine', filters.cuisine);
      if (filters.keywords) params.append('keywords', filters.keywords);
      if (filters.priceRange) params.append('priceRange', filters.priceRange);
      if (filters.minRating) params.append('minRating', filters.minRating.toString());
      
      if (filters.dietaryOptions && filters.dietaryOptions.length > 0) {
        filters.dietaryOptions.forEach((diet: string) => params.append('diet', diet));
      }
      
      if (filters.serviceTypes && filters.serviceTypes.length > 0) {
        filters.serviceTypes.forEach((service: string) => params.append('service', service));
      }
      
      if (filters.dishSpecialties && filters.dishSpecialties.length > 0) {
        filters.dishSpecialties.forEach((dish: string) => params.append('dish', dish));
      }

      // Añadir los IDs de restaurantes encontrados por la IA
      if (data.matches && data.matches.length > 0) {
        const matchIds = data.matches.map((m: any) => m.id).join(',');
        params.append('aiMatches', matchIds);
      }
      
      navigate(`/search?${params.toString()}`);
    } catch (error) {
      console.error('Error en búsqueda inteligente:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo procesar tu búsqueda. Intenta de nuevo.",
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