import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface RestaurantCardProps {
  business: {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    address?: string | null;
    image_url?: string | null;
    price_range?: string | null;
    average_rating?: number | null;
    special_offer?: string | null;
  };
  onClick?: () => void;
}

export const RestaurantCard = ({ business, onClick }: RestaurantCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    checkAuth();
    loadPhotos();
  }, [business.id]);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("business_photos")
      .select("photo_url")
      .eq("business_id", business.id)
      .order("display_order");
    
    if (data && data.length > 0) {
      setPhotos(data.map(p => p.photo_url));
    } else if (business.image_url) {
      setPhotos([business.image_url]);
    }
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      checkFavorite(user.id);
    }
  };

  const checkFavorite = async (userId: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("*")
      .eq("client_id", userId)
      .eq("business_id", business.id)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("Inicia sesión para añadir favoritos");
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from("favorites")
          .delete()
          .eq("client_id", user.id)
          .eq("business_id", business.id);
        toast.success("Eliminado de favoritos");
        setIsFavorite(false);
      } else {
        await supabase
          .from("favorites")
          .insert({
            client_id: user.id,
            business_id: business.id
          });
        toast.success("Añadido a favoritos");
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Error al actualizar favoritos");
    }
  };

  // Extraer ciudad y barrio del address
  const getLocationParts = (address: string | null | undefined) => {
    if (!address) return { neighborhood: "", city: "" };
    const parts = address.split(",").map(p => p.trim());
    if (parts.length >= 2) {
      return {
        neighborhood: parts[parts.length - 2] || "",
        city: parts[parts.length - 1] || ""
      };
    }
    return { neighborhood: "", city: parts[0] || "" };
  };

  const location = getLocationParts(business.address);
  
  // Slots de tiempo de ejemplo (esto debería venir de la API)
  const availableSlots = ["14:30", "20:00", "20:30"];

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Card 
      className="group overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Carousel de Imágenes */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {photos.length > 1 ? (
          <Carousel className="w-full h-full">
            <CarouselContent>
              {photos.map((photo, index) => (
                <CarouselItem key={index}>
                  <img
                    src={photo}
                    alt={`${business.name} - imagen ${index + 1}`}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        ) : (
          <img
            src={photos[0] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"}
            alt={business.name}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Icono de Favorito - Superpuesto */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 bg-background/90 hover:bg-background backdrop-blur-sm h-9 w-9 rounded-full z-10"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(e);
          }}
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
            }`}
          />
        </Button>

        {/* Badge de Oferta - Superpuesto */}
        {business.special_offer && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className="bg-primary text-primary-foreground font-semibold">
              {business.special_offer}
            </Badge>
          </div>
        )}
      </div>

      {/* Contenido de la Tarjeta */}
      <CardContent className="p-4 space-y-3">
        {/* Título */}
        <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {business.name}
        </h3>

        {/* Valoración y Opiniones */}
        {business.average_rating !== null && business.average_rating !== undefined && business.average_rating > 0 && (
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground font-semibold px-2 py-0.5">
              {business.average_rating.toFixed(1)}/10
            </Badge>
            <span className="text-xs text-muted-foreground">
              (120 opiniones)
            </span>
          </div>
        )}

        {/* Categoría y Precio */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{business.category}</span>
          {business.price_range && (
            <>
              <span>·</span>
              <span className="font-medium">{business.price_range}</span>
            </>
          )}
        </div>

        {/* Ubicación */}
        {business.address && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="line-clamp-1">
              {location.neighborhood && `${location.neighborhood}, `}{location.city}
            </span>
          </div>
        )}

        {/* Slots de Disponibilidad */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {availableSlots.map((slot, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  // Aquí iría la lógica de reserva
                }}
              >
                {slot}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};