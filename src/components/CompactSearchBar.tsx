import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Search } from "lucide-react";

interface CompactSearchBarProps {
  initialLocation?: string;
  initialType?: string;
  onSearch?: (location: string, type: string) => void;
}

export const CompactSearchBar = ({ initialLocation = "", initialType = "", onSearch }: CompactSearchBarProps) => {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState(initialLocation);
  const [searchType, setSearchType] = useState(initialType);

  useEffect(() => {
    setSearchLocation(initialLocation);
    setSearchType(initialType);
  }, [initialLocation, initialType]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchLocation, searchType);
    } else {
      const params = new URLSearchParams();
      if (searchLocation) params.append('location', searchLocation);
      if (searchType) params.append('type', searchType);
      navigate(params.toString() ? `/search?${params.toString()}` : "/search");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 flex items-center bg-background border border-input rounded-md h-10 overflow-hidden">
        <div className="relative flex-[0.35]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Ubicación" 
            value={searchLocation} 
            onChange={e => setSearchLocation(e.target.value)} 
            onKeyPress={handleKeyPress} 
            className="h-full border-0 pl-10 pr-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
          />
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="relative flex-[0.65]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Tipo de cocina..." 
            value={searchType} 
            onChange={e => setSearchType(e.target.value)} 
            onKeyPress={handleKeyPress} 
            className="h-full border-0 pl-9 pr-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0" 
          />
        </div>
      </div>
      <Button onClick={handleSearch} size="sm" className="h-10 px-6 font-semibold">
        BUSCAR
      </Button>
    </div>
  );
};
