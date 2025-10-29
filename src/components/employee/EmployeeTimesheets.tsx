import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EmployeeTimesheetsProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeTimesheets = ({ employeeId }: EmployeeTimesheetsProps) => {
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    loadTimesheets();
  }, [employeeId]);

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("timesheets")
        .select("*")
        .eq("employee_id", employeeId)
        .order("clock_in", { ascending: false })
        .limit(50);

      if (error) throw error;

      setTimesheets(data || []);
      
      // Calculate current week total
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      
      const weekData = data?.filter(t => 
        new Date(t.clock_in) >= startOfWeek && t.clock_out
      ) || [];
      
      const total = weekData.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
      setWeekTotal(Math.round(total / 60 * 10) / 10);
    } catch (error) {
      console.error("Error loading timesheets:", error);
      toast.error("Error al cargar fichajes");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const csv = [
      ["Fecha", "Entrada", "Salida", "Duración (min)", "Estado"],
      ...timesheets.map(t => [
        format(new Date(t.clock_in), "dd/MM/yyyy"),
        format(new Date(t.clock_in), "HH:mm"),
        t.clock_out ? format(new Date(t.clock_out), "HH:mm") : "En curso",
        t.duration_minutes || "N/A",
        t.approved ? "Aprobado" : "Pendiente"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fichajes_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Fichajes exportados");
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Horas esta semana</p>
              <p className="text-3xl font-bold">{weekTotal}h</p>
            </div>
          </div>
          
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Timesheets List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Registro de fichajes</h3>
        
        <div className="space-y-2">
          {timesheets.length > 0 ? (
            timesheets.map((timesheet) => (
              <div
                key={timesheet.id}
                className="flex items-center justify-between p-4 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(timesheet.clock_in), "EEEE, d MMMM yyyy", { locale: es })}
                  </p>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>Entrada: {format(new Date(timesheet.clock_in), "HH:mm")}</span>
                    <span>
                      Salida: {timesheet.clock_out 
                        ? format(new Date(timesheet.clock_out), "HH:mm")
                        : "En curso"}
                    </span>
                    {timesheet.duration_minutes && (
                      <span>Duración: {Math.round(timesheet.duration_minutes / 60 * 10) / 10}h</span>
                    )}
                  </div>
                  {timesheet.note && (
                    <p className="text-sm text-muted-foreground mt-1">Nota: {timesheet.note}</p>
                  )}
                </div>
                
                <Badge variant={timesheet.approved ? "default" : "secondary"}>
                  {timesheet.approved ? "Aprobado" : "Pendiente"}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tienes fichajes registrados</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
