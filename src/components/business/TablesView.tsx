import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

interface TablesViewProps {
  businessId: string;
}

export function TablesView({ businessId }: TablesViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Mesas</h1>
        <p className="text-muted-foreground">
          Organiza y gestiona las mesas de tu restaurante
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Distribución de Mesas
          </CardTitle>
          <CardDescription>
            Configura la cantidad, capacidad y ubicación de tus mesas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Funcionalidad de gestión de mesas en desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
