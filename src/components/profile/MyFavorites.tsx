import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { RestaurantCard } from "@/components/public/RestaurantCard";
import { toast } from "sonner";

interface MyFavoritesProps {
  userId: string;
}

interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
  description?: string | null;
  address?: string | null;
  image_url?: string | null;
  price_range?: string | null;
  average_rating?: number | null;
  special_offer?: string | null;
}

export const MyFavorites = ({ userId }: MyFavoritesProps) => {
  const [favorites, setFavorites] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, [userId]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select(`
          business_id,
          businesses (
            id,
            name,
            category,
            description,
            address,
            image_url,
            price_range,
            average_rating,
            special_offer
          )
        `)
        .eq("client_id", userId);

      if (error) throw error;

      const businessesData = data
        ?.map((fav: any) => fav.businesses)
        .filter(Boolean) || [];

      setFavorites(businessesData);
    } catch (error) {
      console.error("Error cargando favoritos:", error);
      toast.error("Error al cargar los favoritos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">
            Aún no tienes restaurantes favoritos.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Explora restaurantes y marca los que más te gusten con el ❤️
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favorites.map((business) => (
        <RestaurantCard key={business.id} business={business} />
      ))}
    </div>
  );
};
