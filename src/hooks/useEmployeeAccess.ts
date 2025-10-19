import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface EmployeeWorkplace {
  id: string;
  name: string;
  business_id: string;
  position: string;
}

export const useEmployeeAccess = (user: User | null) => {
  const [isEmployee, setIsEmployee] = useState(false);
  const [workplaces, setWorkplaces] = useState<EmployeeWorkplace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) {
      setIsEmployee(false);
      setWorkplaces([]);
      setLoading(false);
      return;
    }

    checkEmployeeAccess();
  }, [user]);

  const checkEmployeeAccess = async () => {
    if (!user?.email) return;

    try {
      const { data, error } = await supabase
        .from("waiters")
        .select(`
          id,
          name,
          business_id,
          position,
          businesses!inner (
            id,
            name
          )
        `)
        .eq("email", user.email)
        .eq("is_active", true);

      if (error) throw error;

      const workplacesList = data?.map((w: any) => ({
        id: w.id,
        name: w.businesses.name,
        business_id: w.business_id,
        position: w.position || "Empleado"
      })) || [];

      setWorkplaces(workplacesList);
      setIsEmployee(workplacesList.length > 0);
    } catch (error) {
      console.error("Error checking employee access:", error);
      setIsEmployee(false);
      setWorkplaces([]);
    } finally {
      setLoading(false);
    }
  };

  return { isEmployee, workplaces, loading };
};
