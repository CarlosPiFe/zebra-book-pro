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
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    position: ""
  });

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
      setFormData({
        name: data.name || "",
        position: data.position || ""
      });
    } catch (error) {
      console.error("Error loading employee:", error);
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("waiters")
        .update({
          name: formData.name
        })
        .eq("id", employeeId);

      if (error) throw error;
      
      toast.success("Perfil actualizado");
      await loadEmployee();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar perfil");
    } finally {
      setSaving(false);
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
          <div>
            <Label htmlFor="name">Nombre completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <Label htmlFor="position">Puesto</Label>
            <Input
              id="position"
              value={formData.position}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Solo tu administrador puede cambiar tu puesto
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
