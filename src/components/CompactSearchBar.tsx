import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompactSearchBarProps {
  initialLocation?: string;
  initialType?: string;
  onSearch?: (location: string, type: string) => void;
}

export const CompactSearchBar = ({ initialLocation = "", initialType = "", onSearch }: CompactSearchBarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Combinar location y type en un query si existen
    const query = [initialLocation, initialType].filter(Boolean).join(" ");
    setSearchQuery(query);
  }, [initialLocation, initialType]);

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

      const params = new URLSearchParams();
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

      if (data.matches && data.matches.length > 0) {
        const matchIds = data.matches.map((m: any) => m.id).join(',');
        params.append('aiMatches', matchIds);
      }
      
      if (onSearch && filters.location && filters.cuisine) {
        onSearch(filters.location, filters.cuisine);
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
    <div className="flex gap-2">
      <div className="flex-1 relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary z-10" />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
        <Input 
          placeholder='Ej: "sushi en Madrid" o "italiana con terraza"' 
          value={searchQuery} 
          onChange={e => setSearchQuery(e.target.value)} 
          onKeyPress={handleKeyPress}
          disabled={isSearching}
          className="h-10 pl-10 pr-10 text-sm border-input bg-background"
        />
      </div>
      <Button 
        onClick={handleSearch}
        disabled={isSearching}
        size="sm" 
        className="h-10 px-6 font-semibold"
      >
        {isSearching ? "..." : "BUSCAR"}
      </Button>
    </div>
  );
};
