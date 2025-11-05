import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function CreateDemoBusinesses() {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleCreateBusinesses = async () => {
    setIsCreating(true);
    setResults(null);

    try {
      toast.info("Iniciando creación de 20 negocios demo...");
      
      // Call the edge function
      const { data, error } = await supabase.functions.invoke('create-demo-businesses', {
        body: {}
      });

      if (error) throw error;
      
      setResults(data);
      
      if (data.successful === data.total) {
        toast.success(`¡Éxito! ${data.successful} negocios creados correctamente. Todos tienen contraseña "holahola"`);
      } else {
        toast.warning(`${data.successful} negocios creados, ${data.failed} fallaron. Contraseña para todos: "holahola"`);
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error al crear los negocios demo: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Crear Negocios Demo</CardTitle>
            <CardDescription>
              Esta herramienta creará 20 negocios de prueba con datos ficticios. 
              Cada negocio tendrá una cuenta con email = nombre del negocio y contraseña = "holahola".
              Las fotos se pueden agregar manualmente después.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCreateBusinesses}
              disabled={isCreating}
              size="lg"
              className="w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando negocios...
                </>
              ) : (
                "Crear 20 Negocios Demo"
              )}
            </Button>

            {results && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{results.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                      <div className="text-sm text-muted-foreground">Exitosos</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                      <div className="text-sm text-muted-foreground">Fallidos</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="mb-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Credenciales de acceso:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Email: Nombre del negocio (exactamente como aparece)</li>
                    <li>• Contraseña: <span className="font-mono font-semibold">holahola</span></li>
                  </ul>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {results.results.map((result: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                    >
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <span className="font-medium block">{result.business}</span>
                        {result.success && result.email && (
                          <span className="text-xs text-muted-foreground">
                            Email: {result.email}
                          </span>
                        )}
                      </div>
                      {!result.success && (
                        <span className="text-sm text-muted-foreground ml-auto">
                          Error
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
