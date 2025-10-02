import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface CalendarViewProps {
  businessId: string;
}

export function CalendarView({ businessId }: CalendarViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Calendario</h1>
        <p className="text-muted-foreground">
          Gestiona la disponibilidad y horarios de tu negocio
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Vista de Calendario
          </CardTitle>
          <CardDescription>
            Configura tus horarios disponibles y bloques de tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Funcionalidad de calendario en desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
