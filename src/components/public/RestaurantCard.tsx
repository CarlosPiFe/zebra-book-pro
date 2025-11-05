import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, Star } from "lucide-react";
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
}

export const RestaurantCard = ({ business }: RestaurantCardProps) => {
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

  // Extraer ciudad del address
  const getCity = (address: string | null | undefined) => {
    if (!address) return "";
    const parts = address.split(",");
    return parts[parts.length - 1]?.trim() || address;
  };

  return (
    <Link to={`/business/${business.id}`}>
      <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full rounded-xl border-border/50">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={business.image_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4"}
            alt={business.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-3 right-3 bg-background/90 hover:bg-background backdrop-blur-sm h-9 w-9 rounded-full"
            onClick={toggleFavorite}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground"
              }`}
            />
          </Button>
          {business.special_offer && (
            <div className="absolute bottom-3 left-3">
              <Badge variant="secondary" className="bg-accent/90 text-accent-foreground text-xs rounded-full px-3 backdrop-blur-sm">
                {business.special_offer}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-xl leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {business.name}
            </h3>
            {business.price_range && (
              <span className="text-sm text-muted-foreground/80 whitespace-nowrap font-medium">
                {business.price_range}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground/90">{business.category}</p>
          {business.address && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground/80">
              <MapPin className="h-3.5 w-3.5" />
              <span className="line-clamp-1">{getCity(business.address)}</span>
            </div>
          )}
          {business.average_rating !== null && business.average_rating !== undefined && business.average_rating > 0 && (
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              <span className="text-sm font-medium">
                {business.average_rating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground/70">/10</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};