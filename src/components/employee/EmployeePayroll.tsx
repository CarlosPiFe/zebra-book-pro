import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, DollarSign, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    <div className="space-y-4">
      {/* Summary */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total nóminas</p>
            <p className="text-3xl font-bold">{payrolls.length}</p>
          </div>
        </div>
      </Card>

      {/* Payroll List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de nóminas</h3>
        
        <div className="space-y-3">
          {payrolls.length > 0 ? (
            payrolls.map((payroll) => (
              <div
                key={payroll.id}
                className="p-4 bg-muted rounded-lg"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">
                      {format(new Date(payroll.period_start), "d MMM", { locale: es })} - {format(new Date(payroll.period_end), "d MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {payroll.hours}h trabajadas
                    </p>
                  </div>
                  {getStatusBadge(payroll.status)}
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Bruto</p>
                    <p className="text-lg font-semibold">{payroll.gross_amount}€</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Neto</p>
                    <p className="text-lg font-semibold text-green-600">{payroll.net_amount}€</p>
                  </div>
                </div>

                {payroll.document_url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => window.open(payroll.document_url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar nómina
                  </Button>
                ) : (
                  <div className="mt-3 text-center text-sm text-muted-foreground">
                    Documento no disponible
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No tienes nóminas registradas</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
