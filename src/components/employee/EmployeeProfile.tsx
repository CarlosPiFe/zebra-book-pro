import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";
import { toast } from "sonner";

interface EmployeeProfileProps {
  employeeId: string;
}

export const EmployeeProfile = ({ employeeId }: EmployeeProfileProps) => {
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<any>(null);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (error) throw error;
      
      setEmployee(data);
    } catch (error) {
      console.error("Error loading employee:", error);
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{employee?.name}</h2>
            <p className="text-muted-foreground">{employee?.position || "Empleado"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border mb-4">
            <p className="text-sm text-muted-foreground">
              Tu información de empleado es gestionada por el negocio. Para cambios en tu perfil personal (reservas), accede a tu perfil de usuario.
            </p>
          </div>

          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={employee?.name || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Solo tu administrador puede cambiar tu nombre
            </p>
          </div>

          <div>
            <Label htmlFor="position">Puesto</Label>
            <Input
              id="position"
              value={employee?.position || "Empleado"}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Solo tu administrador puede cambiar tu puesto
            </p>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={employee?.email || ""}
              disabled
              className="bg-muted"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};
