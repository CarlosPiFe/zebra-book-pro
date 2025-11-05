import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Calendar, DollarSign, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
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

interface Vacation {
  id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

interface Payroll {
  id: string;
  period_start: string;
  period_end: string;
  hours: number;
  gross_amount: number;
  net_amount: number;
  status: string;
}

interface EmployeeDetailViewProps {
  employee: Employee;
  onUpdate: () => void;
}

export const EmployeeDetailView = ({ employee, onUpdate }: EmployeeDetailViewProps) => {
  const [editName, setEditName] = useState(employee.name);
  const [editPosition, setEditPosition] = useState(employee.position || "");
  const [editEmail, setEditEmail] = useState(employee.email || "");
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [vacationDateRange, setVacationDateRange] = useState<DateRange>();
  const [newVacationNotes, setNewVacationNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteVacationId, setDeleteVacationId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  useState(() => {
    loadVacations();
    loadPayrolls();
  });

  const loadVacations = async () => {
    try {
      const { data, error } = await supabase
        .from("employee_vacations")
        .select("*")
        .eq("employee_id", employee.id)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setVacations((data || []) as any);
    } catch (error) {
      console.error("Error loading vacations:", error);
    }
  };

  const loadPayrolls = async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("*")
        .eq("employee_id", employee.id)
        .order("period_start", { ascending: false });

      if (error) throw error;
      setPayrolls((data || []) as any);
    } catch (error) {
      console.error("Error loading payrolls:", error);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editName.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("waiters")
        .update({
          name: editName.trim(),
          position: editPosition.trim() || null,
          email: editEmail.trim() || null,
        })
        .eq("id", employee.id);

      if (error) throw error;

      toast.success("Empleado actualizado");
      onUpdate();
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Error al actualizar empleado");
    } finally {
      setLoading(false);
    }
  };

  const handleAddVacation = async () => {
    if (!vacationDateRange?.from || !vacationDateRange?.to) {
      toast.error("Por favor selecciona las fechas de inicio y fin");
      return;
    }

    setLoading(true);
    try {
      const startDateString = format(vacationDateRange.from, "yyyy-MM-dd");
      const endDateString = format(vacationDateRange.to, "yyyy-MM-dd");

      const { error } = await supabase
        .from("employee_vacations")
        .insert({
          employee_id: employee.id,
          start_date: startDateString,
          end_date: endDateString,
          notes: newVacationNotes.trim() || null,
        });

      if (error) throw error;

      toast.success("Vacaciones añadidas");
      setVacationDateRange(undefined);
      setNewVacationNotes("");
      loadVacations();
      onUpdate();
    } catch (error) {
      console.error("Error adding vacation:", error);
      toast.error("Error al añadir vacaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVacation = async () => {
    if (!deleteVacationId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employee_vacations")
        .delete()
        .eq("id", deleteVacationId);

      if (error) throw error;

      toast.success("Vacaciones eliminadas");
      setDeleteVacationId(null);
      loadVacations();
      onUpdate();
    } catch (error) {
      console.error("Error deleting vacation:", error);
      toast.error("Error al eliminar vacaciones");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Employee Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src="" alt={employee.name} />
              <AvatarFallback className="text-lg">{getInitials(employee.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{employee.name}</h2>
              {employee.position && (
                <p className="text-muted-foreground">{employee.position}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">
            <Edit className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Clock className="w-4 h-4 mr-2" />
            Horario
          </TabsTrigger>
          <TabsTrigger value="vacations">
            <Calendar className="w-4 h-4 mr-2" />
            Vacaciones
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <DollarSign className="w-4 h-4 mr-2" />
            Nóminas
          </TabsTrigger>
        </TabsList>

        {/* General Info Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>
                Actualiza los datos básicos del empleado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="editEmail">Correo para Portal de Empleado</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                />
                <p className="text-xs text-muted-foreground">
                  Si se introduce un correo, el empleado podrá acceder al Portal de Empleado
                </p>
              </div>
              <Button onClick={handleUpdateEmployee} disabled={loading}>
                <Edit className="w-4 h-4 mr-2" />
                Actualizar Información
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Horario del Empleado</CardTitle>
              <CardDescription>
                Gestiona los horarios de trabajo del empleado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Esta sección está disponible en el apartado de Horarios del panel principal
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vacations Tab */}
        <TabsContent value="vacations">
          <Card>
            <CardHeader>
              <CardTitle>Vacaciones</CardTitle>
              <CardDescription>
                Gestiona los períodos de vacaciones del empleado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Vacations List */}
              <div className="space-y-2">
                {vacations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay vacaciones registradas
                  </p>
                ) : (
                  <>
                    {vacations.map((vacation) => {
                      const [startYear = 2024, startMonth = 1, startDay = 1] = vacation.start_date.split('-').map(Number);
                      const [endYear = 2024, endMonth = 1, endDay = 1] = vacation.end_date.split('-').map(Number);
                      
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
                              onClick={() => setDeleteVacationId(vacation.id)}
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
                <Button onClick={handleAddVacation} disabled={loading} className="w-full">
                  <Calendar className="w-4 h-4 mr-2" />
                  Añadir Vacaciones
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Nóminas</CardTitle>
              <CardDescription>
                Historial de nóminas del empleado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay nóminas registradas
                </p>
              ) : (
                <div className="space-y-2">
                  {payrolls.map((payroll) => {
                    const startDate = new Date(payroll.period_start);
                    
                    return (
                      <Card key={payroll.id} className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </p>
                            <span className={`text-xs px-2 py-1 rounded ${
                              payroll.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payroll.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {payroll.status === 'paid' ? 'Pagado' : 
                               payroll.status === 'pending' ? 'Pendiente' : 'Borrador'}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Horas: {payroll.hours}h</p>
                            <p>Bruto: €{payroll.gross_amount.toFixed(2)}</p>
                            <p className="font-medium text-foreground">Neto: €{payroll.net_amount.toFixed(2)}</p>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Vacation Alert Dialog */}
      <AlertDialog open={!!deleteVacationId} onOpenChange={() => setDeleteVacationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente este período de vacaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVacation}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
