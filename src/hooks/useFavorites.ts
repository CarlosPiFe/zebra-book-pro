import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useFavorites = () => {
  const [loading, setLoading] = useState(false);

  const toggleFavorite = async (
    businessId: string, 
    userId: string | undefined,
    currentStatus: boolean
  ): Promise<boolean> => {
    if (!userId) {
      toast.error("Debes iniciar sesión para añadir favoritos");
      return currentStatus;
    }

    setLoading(true);
    try {
      if (currentStatus) {
        // Quitar de favoritos
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("client_id", userId)
          .eq("business_id", businessId);

        if (error) throw error;
        toast.success("Eliminado de favoritos");
        return false;
      } else {
        // Añadir a favoritos
        const { error } = await supabase
          .from("favorites")
          .insert([{
            client_id: userId,
            business_id: businessId
          }]);

        if (error) throw error;
        toast.success("Añadido a favoritos");
        return true;
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Error al actualizar favoritos");
      return currentStatus;
    } finally {
      setLoading(false);
    }
  };

  return { toggleFavorite, loading };
};
