import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExportSchedulesDialogProps {
  businessId: string;
}

interface Schedule {
  id: string;
  employee_id: string;
  date: string;
  is_day_off: boolean;
  start_time: string | null;
  end_time: string | null;
  slot_order: number;
}

interface Employee {
  id: string;
  name: string;
}

export function ExportSchedulesDialog({ businessId }: ExportSchedulesDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isExporting, setIsExporting] = useState(false);

  const generateXML = (schedules: Schedule[], employees: Employee[]) => {
    const employeeMap = new Map(employees.map(e => [e.id, e.name]));
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<horarios>\n';
    
    // Agrupar por empleado y fecha
    const groupedByEmployee = new Map<string, Map<string, Schedule[]>>();
    
    schedules.forEach(schedule => {
      if (!groupedByEmployee.has(schedule.employee_id)) {
        groupedByEmployee.set(schedule.employee_id, new Map());
      }
      const employeeSchedules = groupedByEmployee.get(schedule.employee_id)!;
      
      if (!employeeSchedules.has(schedule.date)) {
        employeeSchedules.set(schedule.date, []);
      }
      employeeSchedules.get(schedule.date)!.push(schedule);
    });
    
    // Generar XML por empleado
    groupedByEmployee.forEach((dateSchedules, employeeId) => {
      const employeeName = employeeMap.get(employeeId) || 'Desconocido';
      
      xml += `  <trabajador>\n`;
      xml += `    <nombre>${escapeXML(employeeName)}</nombre>\n`;
      xml += `    <turnos>\n`;
      
      // Ordenar fechas
      const sortedDates = Array.from(dateSchedules.keys()).sort();
      
      sortedDates.forEach(date => {
        const daySchedules = dateSchedules.get(date)!.sort((a, b) => a.slot_order - b.slot_order);
        
        xml += `      <dia>\n`;
        xml += `        <fecha>${date}</fecha>\n`;
        
        if (daySchedules[0].is_day_off) {
          xml += `        <estado>dia_libre</estado>\n`;
        } else {
          xml += `        <turnos_horarios>\n`;
          
          daySchedules.forEach((schedule, index) => {
            if (schedule.start_time && schedule.end_time) {
              xml += `          <turno orden="${index + 1}">\n`;
              xml += `            <hora_inicio>${schedule.start_time}</hora_inicio>\n`;
              xml += `            <hora_fin>${schedule.end_time}</hora_fin>\n`;
              xml += `          </turno>\n`;
            }
          });
          
          xml += `        </turnos_horarios>\n`;
        }
        
        xml += `      </dia>\n`;
      });
      
      xml += `    </turnos>\n`;
      xml += `  </trabajador>\n`;
    });
    
    xml += '</horarios>';
    
    return xml;
  };

  const escapeXML = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error("Por favor selecciona ambas fechas");
      return;
    }

    if (startDate > endDate) {
      toast.error("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    setIsExporting(true);

    try {
      // Obtener empleados
      const { data: employees, error: employeesError } = await supabase
        .from("waiters")
        .select("id, name")
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (employeesError) throw employeesError;

      if (!employees || employees.length === 0) {
        toast.error("No hay empleados activos");
        setIsExporting(false);
        return;
      }

      // Obtener horarios en el rango de fechas
      const { data: schedules, error: schedulesError } = await supabase
        .from("employee_weekly_schedules")
        .select("*")
        .in("employee_id", employees.map(e => e.id))
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("employee_id")
        .order("date")
        .order("slot_order");

      if (schedulesError) throw schedulesError;

      if (!schedules || schedules.length === 0) {
        toast.error("No hay horarios en el rango seleccionado");
        setIsExporting(false);
        return;
      }

      // Generar XML
      const xml = generateXML(schedules, employees);

      // Crear y descargar archivo
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `horarios_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Horarios exportados correctamente");
      setOpen(false);
    } catch (error) {
      console.error("Error al exportar horarios:", error);
      toast.error("Error al exportar los horarios");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar horarios (XML)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar horarios a XML</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de inicio</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: es }) : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Fecha de fin</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP", { locale: es }) : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={!startDate || !endDate || isExporting}
            >
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
