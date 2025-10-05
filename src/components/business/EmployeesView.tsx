import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus, Trash2, UserPlus } from "lucide-react";
import { EmployeeSchedule } from "./EmployeeSchedule";

interface Employee {
  id: string;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

interface EmployeesViewProps {
  businessId: string;
}

export const EmployeesView = ({ businessId }: EmployeesViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, [businessId]);

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error("Error loading employees:", error);
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateEmployee = async () => {
    if (!newEmployeeName.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }

    try {
      const token = generateToken();
      const { error } = await supabase
        .from("waiters")
        .insert({
          business_id: businessId,
          name: newEmployeeName.trim(),
          token: token,
        });

      if (error) throw error;

      toast.success("Empleado creado exitosamente");
      setNewEmployeeName("");
      setIsDialogOpen(false);
      loadEmployees();
    } catch (error) {
      console.error("Error creating employee:", error);
      toast.error("Error al crear empleado");
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from("waiters")
        .delete()
        .eq("id", employeeId);

      if (error) throw error;

      toast.success("Empleado eliminado");
      loadEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Error al eliminar empleado");
    }
  };

  const copyEmployeeLink = (token: string) => {
    const link = `${window.location.origin}/waiter/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado al portapapeles");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Empleados</h2>
          <p className="text-muted-foreground">Gestiona los empleados de tu negocio</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Empleado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Empleado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeName">Nombre del Empleado</Label>
                <Input
                  id="employeeName"
                  value={newEmployeeName}
                  onChange={(e) => setNewEmployeeName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <Button onClick={handleCreateEmployee} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Empleado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {employees.length === 0 ? (
        <Card className="p-8 text-center">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay empleados</h3>
          <p className="text-muted-foreground mb-4">
            Agrega tu primer empleado para comenzar
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {employees.map((employee) => (
            <div key={employee.id} className="space-y-4">
              <Card className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{employee.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Creado: {new Date(employee.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyEmployeeLink(employee.token)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copiar Link
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
              <EmployeeSchedule employeeId={employee.id} employeeName={employee.name} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
