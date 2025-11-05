import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { EmployeesOverview } from "./EmployeesOverview";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
  position?: string;
  email?: string;
  vacationCount?: number;
}

interface EmployeesViewProps {
  businessId: string;
}

export const EmployeesView = ({ businessId }: EmployeesViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [deleteEmployeeId, setDeleteEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    loadEmployees();
  }, [businessId]);

  const loadEmployees = async () => {
    try {
      const { data: employeesData, error: employeesError } = await supabase
        .from("waiters")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (employeesError) throw employeesError;

      // Load vacation counts for each employee
      const employeesWithVacations = await Promise.all(
        (employeesData || []).map(async (employee) => {
          const { count } = await supabase
            .from("employee_vacations")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", employee.id);

          return {
            ...employee,
            vacationCount: count || 0,
          };
        })
      );

      setEmployees(employeesWithVacations as any);
      
      // Si hay un empleado seleccionado, actualizarlo
      if (selectedEmployee) {
        const updatedEmployee = employeesWithVacations.find(e => e.id === selectedEmployee.id);
        if (updatedEmployee) {
          setSelectedEmployee(updatedEmployee as any);
        }
      }
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
          position: newEmployeePosition.trim() || null,
          email: newEmployeeEmail.trim() || null,
        });

      if (error) throw error;

      toast.success("Empleado creado exitosamente");
      setNewEmployeeName("");
      setNewEmployeePosition("");
      setNewEmployeeEmail("");
      setIsDialogOpen(false);
      loadEmployees();
    } catch (error) {
      console.error("Error creating employee:", error);
      toast.error("Error al crear empleado");
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteEmployeeId) return;
    
    try {
      const { error } = await supabase
        .from("waiters")
        .delete()
        .eq("id", deleteEmployeeId);

      if (error) throw error;

      toast.success("Empleado eliminado");
      setDeleteEmployeeId(null);
      
      // Si el empleado eliminado es el seleccionado, limpiar la selección
      if (selectedEmployee?.id === deleteEmployeeId) {
        setSelectedEmployee(null);
      }
      
      loadEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Error al eliminar empleado");
    }
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
              <div className="space-y-2">
                <Label htmlFor="employeePosition">Cargo (Opcional)</Label>
                <Input
                  id="employeePosition"
                  value={newEmployeePosition}
                  onChange={(e) => setNewEmployeePosition(e.target.value)}
                  placeholder="Ej: Cocinero, Gerente, Cajero"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeEmail">Correo para Portal de Empleado (Opcional)</Label>
                <Input
                  id="employeeEmail"
                  type="email"
                  value={newEmployeeEmail}
                  onChange={(e) => setNewEmployeeEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Si se introduce un correo, el empleado podrá acceder al Portal de Empleado con su cuenta
                </p>
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
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Employee List - Left Column */}
          <div className="w-80 flex flex-col space-y-3 overflow-y-auto pr-2">
            {employees.map((employee) => (
              <Card 
                key={employee.id} 
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  selectedEmployee?.id === employee.id 
                    ? "ring-2 ring-primary bg-accent/50" 
                    : "hover:bg-accent/50"
                )}
                onClick={() => handleEmployeeClick(employee)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src="" alt={employee.name} />
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{employee.name}</h3>
                    {employee.position && (
                      <p className="text-sm text-muted-foreground truncate">
                        {employee.position}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {employee.vacationCount === 0 
                        ? "Sin vacaciones" 
                        : `${employee.vacationCount} vacaciones`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteEmployeeId(employee.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Employee Detail - Right Column */}
          <div className="flex-1 overflow-y-auto">
            {selectedEmployee ? (
              <EmployeeDetailView
                employee={selectedEmployee}
                onUpdate={loadEmployees}
              />
            ) : (
              <EmployeesOverview employees={employees} />
            )}
          </div>
        </div>
      )}

      {/* Delete Employee Alert Dialog */}
      <AlertDialog open={!!deleteEmployeeId} onOpenChange={() => setDeleteEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este empleado
              y todos sus datos asociados (horarios, vacaciones, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
