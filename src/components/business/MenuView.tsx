import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed } from "lucide-react";

interface MenuViewProps {
  businessId: string;
}

export function MenuView({ businessId }: MenuViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de Menú</h1>
        <p className="text-muted-foreground">
          Crea y gestiona el menú de tu restaurante
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5" />
            Menú y Platos
          </CardTitle>
          <CardDescription>
            Añade categorías, platos, precios y descripciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <p>Funcionalidad de gestión de menú en desarrollo</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
