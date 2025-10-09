import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus, Trash2, UserPlus, Edit, Calendar } from "lucide-react";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface Employee {
  id: string;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
  position?: string;
  vacationCount?: number;
}

interface Vacation {
  id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

interface EmployeesViewProps {
  businessId: string;
}

export const EmployeesView = ({ businessId }: EmployeesViewProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [vacationDateRange, setVacationDateRange] = useState<DateRange>();
  const [newVacationNotes, setNewVacationNotes] = useState("");

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

      setEmployees(employeesWithVacations);
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
        });

      if (error) throw error;

      toast.success("Empleado creado exitosamente");
      setNewEmployeeName("");
      setNewEmployeePosition("");
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

  const handleEmployeeClick = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditName(employee.name);
    setEditPosition(employee.position || "");
    setIsEditDialogOpen(true);
    await loadVacations(employee.id);
  };

  const loadVacations = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from("employee_vacations")
        .select("*")
        .eq("employee_id", employeeId)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setVacations(data || []);
    } catch (error) {
      console.error("Error loading vacations:", error);
      toast.error("Error al cargar vacaciones");
    }
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee || !editName.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }

    try {
      const { error } = await supabase
        .from("waiters")
        .update({
          name: editName.trim(),
          position: editPosition.trim() || null,
        })
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success("Empleado actualizado");
      setIsEditDialogOpen(false);
      loadEmployees();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Error al actualizar empleado");
    }
  };

  const handleAddVacation = async () => {
    if (!selectedEmployee || !vacationDateRange?.from || !vacationDateRange?.to) {
      toast.error("Por favor selecciona las fechas de inicio y fin");
      return;
    }

    try {
      // Usar las fechas directamente sin conversión de zona horaria
      const startDateString = format(vacationDateRange.from, "yyyy-MM-dd");
      const endDateString = format(vacationDateRange.to, "yyyy-MM-dd");

      const { error } = await supabase
        .from("employee_vacations")
        .insert({
          employee_id: selectedEmployee.id,
          start_date: startDateString,
          end_date: endDateString,
          notes: newVacationNotes.trim() || null,
        });

      if (error) throw error;

      toast.success("Vacaciones añadidas");
      setVacationDateRange(undefined);
      setNewVacationNotes("");
      loadVacations(selectedEmployee.id);
      loadEmployees(); // Refresh employee list to update vacation count
    } catch (error) {
      console.error("Error adding vacation:", error);
      toast.error("Error al añadir vacaciones");
    }
  };

  const handleDeleteVacation = async (vacationId: string) => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from("employee_vacations")
        .delete()
        .eq("id", vacationId);

      if (error) throw error;

      toast.success("Vacaciones eliminadas");
      loadVacations(selectedEmployee.id);
      loadEmployees(); // Refresh employee list to update vacation count
    } catch (error) {
      console.error("Error deleting vacation:", error);
      toast.error("Error al eliminar vacaciones");
    }
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
              <div className="space-y-2">
                <Label htmlFor="employeePosition">Cargo (Opcional)</Label>
                <Input
                  id="employeePosition"
                  value={newEmployeePosition}
                  onChange={(e) => setNewEmployeePosition(e.target.value)}
                  placeholder="Ej: Cocinero, Gerente, Cajero"
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
        <div className="grid gap-4">
          {employees.map((employee) => (
            <Card 
              key={employee.id} 
              className="p-6 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleEmployeeClick(employee)}
            >
              <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{employee.name}</h3>
                {employee.position && (
                  <p className="text-sm font-medium text-muted-foreground">
                    {employee.position}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {employee.vacationCount === 0 
                    ? "Sin vacaciones añadidas" 
                    : `${employee.vacationCount} ${employee.vacationCount === 1 ? "período de vacaciones" : "períodos de vacaciones"}`}
                </p>
              </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
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
          ))}
        </div>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empleado</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Employee Info Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Información del Empleado</h3>
              <div className="space-y-2">
                <Label htmlFor="editName">Nombre</Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nombre del empleado"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPosition">Cargo</Label>
                <Input
                  id="editPosition"
                  value={editPosition}
                  onChange={(e) => setEditPosition(e.target.value)}
                  placeholder="Cargo del empleado"
                />
              </div>
              <Button onClick={handleUpdateEmployee} className="w-full">
                <Edit className="w-4 h-4 mr-2" />
                Actualizar Información
              </Button>
            </div>

            {/* Vacations Section */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Vacaciones</h3>
              
              {/* Vacations List */}
              <div className="space-y-2">
                {vacations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay vacaciones registradas
                  </p>
                ) : (
                  <>
                    {vacations.map((vacation) => {
                      // Parsear las fechas como strings de fecha (sin hora) para evitar problemas de zona horaria
                      const [startYear, startMonth, startDay] = vacation.start_date.split('-').map(Number);
                      const [endYear, endMonth, endDay] = vacation.end_date.split('-').map(Number);
                      
                      const startDate = new Date(startYear, startMonth - 1, startDay);
                      const endDate = new Date(endYear, endMonth - 1, endDay);
                      
                      return (
                        <Card key={vacation.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">
                                {startDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {endDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                              {vacation.notes && (
                                <p className="text-sm text-muted-foreground">{vacation.notes}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVacation(vacation.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </>
                )}
              </div>

              {/* Add Vacation */}
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border-t mt-4">
                <h4 className="font-medium">Añadir Nuevas Vacaciones</h4>
                <div className="space-y-2">
                  <Label>Rango de Fechas</Label>
                  <DateRangePicker
                    dateRange={vacationDateRange}
                    onDateRangeChange={setVacationDateRange}
                    placeholder="Seleccionar fechas de vacaciones"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notas (Opcional)</Label>
                  <Input
                    value={newVacationNotes}
                    onChange={(e) => setNewVacationNotes(e.target.value)}
                    placeholder="Ej: Vacaciones de verano"
                  />
                </div>
                <Button onClick={handleAddVacation} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Añadir Vacaciones
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
