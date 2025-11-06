import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Calendar, DollarSign, Clock, Plus, Download, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  document_url?: string | null;
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
  const [deletePayrollId, setDeletePayrollId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVacationDialogOpen, setIsVacationDialogOpen] = useState(false);
  const [uploadingPayroll, setUploadingPayroll] = useState(false);

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

  useEffect(() => {
    loadVacations();
    loadPayrolls();
  }, [employee.id]);

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
      setIsEditDialogOpen(false);
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
      setIsVacationDialogOpen(false);
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

  const handleUploadPayroll = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast.error("Solo se permiten archivos PDF o Word");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10485760) {
      toast.error("El archivo no debe superar los 10MB");
      return;
    }

    setUploadingPayroll(true);
    try {
      // Get business_id from employee
      const { data: waiterData } = await supabase
        .from("waiters")
        .select("business_id")
        .eq("id", employee.id)
        .single();

      if (!waiterData) throw new Error("No se pudo obtener información del negocio");

      const businessId = waiterData.business_id;
      const fileName = `${businessId}/${employee.id}/${Date.now()}_${file.name}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("payroll-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create payroll record with document URL
      const { error: insertError } = await supabase
        .from("payroll_records")
        .insert([{
          employee_id: employee.id,
          business_id: businessId,
          period_start: new Date().toISOString().split('T')[0],
          period_end: new Date().toISOString().split('T')[0],
          hours: 0,
          gross_amount: 0,
          net_amount: 0,
          status: 'draft' as const,
          document_url: fileName,
        }] as any);

      if (insertError) throw insertError;

      toast.success("Nómina subida correctamente");
      setIsVacationDialogOpen(false);
      loadPayrolls();
      
      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error("Error uploading payroll:", error);
      toast.error("Error al subir la nómina");
    } finally {
      setUploadingPayroll(false);
    }
  };

  const handleDownloadPayroll = async (payroll: Payroll) => {
    if (!payroll.document_url) {
      toast.error("Este documento no está disponible");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from("payroll-documents")
        .download(payroll.document_url);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = payroll.document_url.split('/').pop() || 'nomina.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Descarga iniciada");
    } catch (error) {
      console.error("Error downloading payroll:", error);
      toast.error("Error al descargar la nómina");
    }
  };

  const handleDeletePayroll = async () => {
    if (!deletePayrollId) return;

    setLoading(true);
    try {
      // Find the payroll to get the document_url
      const payroll = payrolls.find(p => p.id === deletePayrollId);
      
      // Delete file from storage if it exists
      if (payroll?.document_url) {
        await supabase.storage
          .from("payroll-documents")
          .remove([payroll.document_url]);
      }

      // Delete payroll record
      const { error } = await supabase
        .from("payroll_records")
        .delete()
        .eq("id", deletePayrollId);

      if (error) throw error;

      toast.success("Nómina eliminada");
      setDeletePayrollId(null);
      loadPayrolls();
    } catch (error) {
      console.error("Error deleting payroll:", error);
      toast.error("Error al eliminar la nómina");
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
              <div className="flex items-center justify-between w-full gap-4">
                <CardTitle className="flex-1">Información del Empleado</CardTitle>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-shrink-0 h-8 text-xs">
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Información</DialogTitle>
                      <DialogDescription>
                        Actualiza los datos básicos del empleado
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                      <Button onClick={handleUpdateEmployee} disabled={loading} className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Actualizar Información
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-muted-foreground">Nombre</Label>
                  <p className="text-lg font-medium mt-1">{employee.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cargo</Label>
                  <p className="text-lg mt-1">{employee.position || "No especificado"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Correo Electrónico</Label>
                  <p className="text-lg mt-1">{employee.email || "No especificado"}</p>
                </div>
              </div>
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
              <div className="flex items-center justify-between w-full gap-4">
                <div>
                  <CardTitle>Vacaciones</CardTitle>
                  <CardDescription>
                    Gestiona los períodos de vacaciones del empleado
                  </CardDescription>
                </div>
                <Dialog open={isVacationDialogOpen} onOpenChange={setIsVacationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Vacaciones
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Añadir Nuevas Vacaciones</DialogTitle>
                      <DialogDescription>
                        Selecciona el período de vacaciones del empleado
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
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
                  </DialogContent>
                </Dialog>
              </div>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full gap-4">
                <div>
                  <CardTitle>Nóminas</CardTitle>
                  <CardDescription>
                    Historial de nóminas del empleado
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    id="payroll-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleUploadPayroll}
                    disabled={uploadingPayroll}
                  />
                  <Button 
                    size="sm"
                    onClick={() => document.getElementById('payroll-upload')?.click()}
                    disabled={uploadingPayroll}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {uploadingPayroll ? "Subiendo..." : "Añadir Nómina"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {payrolls.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay nóminas registradas
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {payrolls.map((payroll) => {
                    const startDate = new Date(payroll.period_start);
                    const fileName = payroll.document_url?.split('/').pop() || 'Documento';
                    
                    return (
                      <Card key={payroll.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="space-y-3">
                          {/* File Icon and Name */}
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <FileText className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate" title={fileName}>
                                {fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {startDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            <span className={`inline-flex text-xs px-2 py-1 rounded ${
                              payroll.status === 'paid' ? 'bg-green-100 text-green-700' :
                              payroll.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {payroll.status === 'paid' ? 'Pagado' : 
                               payroll.status === 'pending' ? 'Pendiente' : 'Borrador'}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2 border-t">
                            {payroll.document_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleDownloadPayroll(payroll)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Descargar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletePayrollId(payroll.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

      {/* Delete Payroll Alert Dialog */}
      <AlertDialog open={!!deletePayrollId} onOpenChange={() => setDeletePayrollId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente esta nómina y su documento asociado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayroll}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
