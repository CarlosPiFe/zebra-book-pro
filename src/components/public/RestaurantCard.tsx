import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  // Slots de tiempo de ejemplo con descuentos
  const availableSlots = [
    { time: "20:00", discount: "-50%" },
    { time: "20:15", discount: "-50%" },
    { time: "20:30", discount: "-50%" },
    { time: "20:45", discount: "-50%" },
    { time: "21:00", discount: "-50%" }
  ];

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <Card 
      className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border"
      onClick={handleCardClick}
    >
      <div className="flex gap-0">
        {/* Imagen Cuadrada a la Izquierda */}
        <div className="relative w-64 h-64 flex-shrink-0 overflow-hidden">
          <img
            src={photos[currentPhotoIndex] || photos[0] || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"}
            alt={business.name}
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
          
          {/* Indicadores de foto (dots) */}
          {photos.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {photos.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPhotoIndex(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentPhotoIndex 
                      ? "bg-white w-3" 
                      : "bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Botones de navegación */}
          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <span className="text-lg">‹</span>
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 hover:bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <span className="text-lg">›</span>
              </button>
            </>
          )}
          
          {/* Icono de Favorito */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 bg-background/90 hover:bg-background backdrop-blur-sm h-9 w-9 rounded-full z-10"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(e);
            }}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
              }`}
            />
          </Button>
        </div>

        {/* Contenido a la Derecha */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          {/* Header con Título y Rating */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors flex-1 min-w-0">
                {business.name}
              </h3>
              
              {/* Rating Score a la derecha */}
              {business.average_rating !== null && business.average_rating !== undefined && business.average_rating > 0 && (
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className="text-2xl font-bold text-primary">
                    {business.average_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (941)
                  </span>
                </div>
              )}
            </div>

            {/* Dirección completa */}
            {business.address && (
              <p className="text-sm text-muted-foreground mb-1">
                {business.address}
              </p>
            )}

            {/* Categoría y Precio */}
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="font-medium">{business.category}</span>
              {business.price_range && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">Precio medio {business.price_range}</span>
                </>
              )}
            </div>

            {/* Badges de Ofertas */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {business.special_offer && (
                <Badge variant="secondary" className="bg-foreground text-background font-semibold px-3 py-1">
                  {business.special_offer}
                </Badge>
              )}
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 font-medium px-3 py-1">
                🔥 Yums x3
              </Badge>
            </div>

            {/* Descripción destacada */}
            {business.description && (
              <p className="text-sm italic text-foreground mb-4 line-clamp-2">
                "{business.description}"
              </p>
            )}
          </div>

          {/* Slots de Tiempo */}
          <div className="flex items-start gap-2 flex-wrap">
            {availableSlots.map((slot, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 h-8 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Lógica de reserva
                  }}
                >
                  {slot.time}
                </Button>
                <Badge variant="secondary" className="bg-foreground text-background text-[10px] font-bold px-1.5 py-0 h-4">
                  {slot.discount}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};