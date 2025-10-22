import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export const useBusinessOwner = (user: User | null) => {
  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasBusinesses(false);
      setLoading(false);
      return;
    }

    checkBusinessOwnership();
  }, [user]);

  const checkBusinessOwnership = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1);

      if (error) throw error;

      setHasBusinesses((data?.length || 0) > 0);
    } catch (error) {
      console.error("Error checking business ownership:", error);
      setHasBusinesses(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasBusinesses, loading };
};
