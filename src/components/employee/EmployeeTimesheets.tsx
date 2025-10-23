import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmployeeTimesheetsProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeTimesheets = ({ employeeId, businessId }: EmployeeTimesheetsProps) => {
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
    <div className="space-y-3 md:space-y-4">
      {/* Summary Card - Más compacto en móvil */}
      <Card className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Horas esta semana</p>
              <p className="text-2xl md:text-3xl font-bold">{weekTotal}h</p>
            </div>
          </div>
          
          <Button onClick={handleExport} variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
            <span className="text-xs md:text-sm">Exportar</span>
          </Button>
        </div>
      </Card>

      {/* Timesheets List - Con collapsibles en móvil */}
      <Card className="p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Registro de fichajes</h3>
        
        <div className="space-y-2">
          {timesheets.length > 0 ? (
            timesheets.map((timesheet) => (
              <Collapsible key={timesheet.id}>
                <Card className="p-0 overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 md:p-4 text-left hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium truncate">
                          {format(new Date(timesheet.clock_in), "EEE, d MMM yyyy", { locale: es })}
                        </p>
                        <div className="flex items-center gap-2 md:gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{format(new Date(timesheet.clock_in), "HH:mm")}</span>
                          <span>-</span>
                          <span>
                            {timesheet.clock_out 
                              ? format(new Date(timesheet.clock_out), "HH:mm")
                              : "En curso"}
                          </span>
                          {timesheet.duration_minutes && (
                            <>
                              <span>•</span>
                              <span>{Math.round(timesheet.duration_minutes / 60 * 10) / 10}h</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={timesheet.approved ? "default" : "secondary"} className="text-[10px] md:text-xs">
                          {timesheet.approved ? "✓" : "⋯"}
                        </Badge>
                        <ChevronDown className="w-4 h-4 text-muted-foreground md:hidden" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 md:px-4 md:pb-4 pt-0 border-t bg-muted/20">
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Entrada</p>
                          <p className="font-medium">{format(new Date(timesheet.clock_in), "HH:mm:ss")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Salida</p>
                          <p className="font-medium">
                            {timesheet.clock_out 
                              ? format(new Date(timesheet.clock_out), "HH:mm:ss")
                              : "En curso"}
                          </p>
                        </div>
                        {timesheet.duration_minutes && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Duración total</p>
                            <p className="font-medium">{Math.round(timesheet.duration_minutes / 60 * 10) / 10} horas</p>
                          </div>
                        )}
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Estado</p>
                          <p className="font-medium">{timesheet.approved ? "Aprobado" : "Pendiente de aprobación"}</p>
                        </div>
                        {timesheet.note && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground">Nota</p>
                            <p className="font-medium">{timesheet.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <Clock className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">No tienes fichajes registrados</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
