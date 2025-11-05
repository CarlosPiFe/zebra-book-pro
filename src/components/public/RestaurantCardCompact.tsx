import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface RestaurantCardCompactProps {
  business: {
    id: string;
    name: string;
    category: string;
    address?: string | null;
    image_url?: string | null;
  };
}

export const RestaurantCardCompact = ({ business }: RestaurantCardCompactProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [business.id]);

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

  const handleClick = () => {
    navigate(`/business/${business.id}`);
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        <div className="aspect-square overflow-hidden">
          <img
            src={business.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"}
            alt={business.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        <button
          onClick={toggleFavorite}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white backdrop-blur-sm flex items-center justify-center transition-colors z-10"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${
              isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"
            }`}
          />
        </button>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1">
          {business.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          {business.category}
        </p>
        {business.address && (
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-1">{business.address}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
