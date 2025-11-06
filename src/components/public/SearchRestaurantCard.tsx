import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SearchRestaurantCardProps {
  business: {
    id: string;
    name: string;
    cuisine_type: string | null;
    description?: string | null;
    address?: string | null;
    image_url?: string | null;
    price_range?: string | null;
    average_rating?: number | null;
    special_offer?: string | null;
  };
  onClick: () => void;
}

export const SearchRestaurantCard = ({ business, onClick }: SearchRestaurantCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

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

  return (
    <Card 
      className="flex flex-row overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-all duration-300 min-h-[12rem]"
      onClick={onClick}
    >
      {/* Columna Izquierda: Imagen (1/3) */}
      <div className="w-1/3 relative aspect-square">
        <img
          src={business.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"}
          alt={business.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
        {/* Overlay Corazón */}
        <Button
          size="icon"
          variant="ghost"
          className="absolute top-2 right-2 bg-background/90 hover:bg-background backdrop-blur-sm h-9 w-9 rounded-full"
          onClick={toggleFavorite}
        >
          <Heart
            className={`h-4 w-4 text-white drop-shadow-md transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : ""
            }`}
          />
        </Button>
      </div>

      {/* Columna Derecha: Información (2/3) */}
      <div className="w-2/3 p-4 flex flex-col justify-between relative">
        {/* Overlay Valoración */}
        {business.average_rating !== null && business.average_rating !== undefined && business.average_rating > 0 && (
          <div className="absolute top-4 right-4 flex items-center gap-1">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="font-bold">{business.average_rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">/10</span>
          </div>
        )}

        {/* Contenido Superior */}
        <div>
          <h2 className="text-lg font-bold pr-16">{business.name}</h2>
          <p className="text-sm text-muted-foreground">
            {business.cuisine_type || "Restaurante"}
          </p>
          {business.address && (
            <p className="text-sm text-foreground mt-1">{business.address}</p>
          )}
          {business.price_range && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground pt-1">
              <span>∼</span>
              <span>{business.price_range}</span>
              <span>/</span>
              <User size={14} className="mt-0.5" />
            </div>
          )}
        </div>

        {/* Contenido Inferior: Botones de Hora */}
        <div className="flex flex-wrap gap-2 pt-4">
          <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20">14:00</Button>
          <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20">14:30</Button>
          <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20">21:00</Button>
          <Button size="sm" className="bg-primary/10 text-primary hover:bg-primary/20">21:30</Button>
        </div>
      </div>
    </Card>
  );
};
