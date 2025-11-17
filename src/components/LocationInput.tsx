import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Locate } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface LocationInputProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
}

export const LocationInput = ({ value, onChange, placeholder = "¿Dónde?", className }: LocationInputProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Usar el token del usuario desde Secrets
      const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (!token) {
        console.error('MAPBOX_PUBLIC_TOKEN no está configurado');
        return;
      }
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&language=es&country=ES&types=place,locality,neighborhood,address&limit=5`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error buscando ubicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.place_name);
    onChange(suggestion.place_name, suggestion.center[1], suggestion.center[0]);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en tu navegador');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Usar el token del usuario desde Secrets
          const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
          if (!token) {
            console.error('MAPBOX_PUBLIC_TOKEN no está configurado');
            setInputValue('Mi ubicación');
            onChange('Mi ubicación', latitude, longitude);
            return;
          }
          
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&language=es`
          );
          
          if (response.ok) {
            const data = await response.json();
            const placeName = data.features[0]?.place_name || 'Mi ubicación';
            setInputValue(placeName);
            onChange(placeName, latitude, longitude);
          } else {
            setInputValue('Mi ubicación');
            onChange('Mi ubicación', latitude, longitude);
          }
        } catch (error) {
          console.error('Error obteniendo dirección:', error);
          setInputValue('Mi ubicación');
          onChange('Mi ubicación', latitude, longitude);
        } finally {
          setGettingLocation(false);
        }
      },
      (error) => {
        console.error('Error obteniendo ubicación:', error);
        alert('No se pudo obtener tu ubicación. Verifica los permisos del navegador.');
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pl-10 pr-3"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleGetCurrentLocation}
          disabled={gettingLocation}
          title="Usar mi ubicación"
        >
          {gettingLocation ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Locate className="h-4 w-4" />
          )}
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full px-4 py-2 text-left hover:bg-accent transition-colors text-sm flex items-start gap-2"
              onClick={() => handleSelectSuggestion(suggestion)}
            >
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
              <span>{suggestion.place_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
