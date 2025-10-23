import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, FileText, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmployeePayrollProps {
  employeeId: string;
  businessId: string;
}

export const EmployeePayroll = ({ employeeId, businessId }: EmployeePayrollProps) => {
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState<any[]>([]);

  useEffect(() => {
    loadPayrolls();
  }, [employeeId]);

  const loadPayrolls = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("*")
        .eq("employee_id", employeeId)
        .order("period_end", { ascending: false });

      if (error) throw error;
      setPayrolls(data || []);
    } catch (error) {
      console.error("Error loading payroll:", error);
      toast.error("Error al cargar nóminas");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      paid: "default",
      issued: "secondary",
      draft: "outline"
    };
    
    const labels: Record<string, string> = {
      paid: "Pagada",
      issued: "Emitida",
      draft: "Borrador"
    };

    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Summary - Más compacto en móvil */}
      <Card className="p-3 md:p-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-primary" />
          </div>
          <div>
            <p className="text-xs md:text-sm text-muted-foreground">Total nóminas</p>
            <p className="text-2xl md:text-3xl font-bold">{payrolls.length}</p>
          </div>
        </div>
      </Card>

      {/* Payroll List - Con collapsibles */}
      <Card className="p-3 md:p-6">
        <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Histórico de nóminas</h3>
        
        <div className="space-y-2">
          {payrolls.length > 0 ? (
            payrolls.map((payroll) => (
              <Collapsible key={payroll.id}>
                <Card className="p-0 overflow-hidden">
                  <CollapsibleTrigger className="w-full p-3 md:p-4 text-left hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-medium">
                          {format(new Date(payroll.period_start), "d MMM", { locale: es })} - {format(new Date(payroll.period_end), "d MMM yy", { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {payroll.hours}h • {payroll.net_amount}€
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(payroll.status)}
                        <ChevronDown className="w-4 h-4 text-muted-foreground md:hidden" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 md:px-4 md:pb-4 pt-0 border-t bg-muted/20">
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Importe bruto</p>
                          <p className="text-base md:text-lg font-semibold">{payroll.gross_amount}€</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Importe neto</p>
                          <p className="text-base md:text-lg font-semibold text-green-600">{payroll.net_amount}€</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Horas trabajadas</p>
                          <p className="text-sm font-medium">{payroll.hours} horas</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Período</p>
                          <p className="text-sm font-medium">
                            {format(new Date(payroll.period_start), "d MMMM", { locale: es })} - {format(new Date(payroll.period_end), "d MMMM yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>

                      {payroll.document_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full text-xs"
                          onClick={() => window.open(payroll.document_url, '_blank')}
                        >
                          <Download className="w-3.5 h-3.5 mr-2" />
                          Descargar nómina PDF
                        </Button>
                      ) : (
                        <div className="mt-3 text-center text-xs text-muted-foreground">
                          Documento no disponible
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <FileText className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">No tienes nóminas registradas</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
