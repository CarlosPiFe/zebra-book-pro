import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { createDemoBusinesses } from "@/utils/createDemoBusinesses";

export default function CreateDemoBusinesses() {
  const [isCreating, setIsCreating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleCreateBusinesses = async () => {
    setIsCreating(true);
    setResults(null);

    try {
      toast.info("Iniciando creación de 20 negocios demo...");
      const result = await createDemoBusinesses();
      
      setResults(result);
      
      if (result.successful === result.total) {
        toast.success(`¡Éxito! ${result.successful} negocios creados correctamente`);
      } else {
        toast.warning(`${result.successful} negocios creados, ${result.failed} fallaron`);
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
              Esta herramienta creará 20 negocios de prueba con sus imágenes comprimidas
              y datos ficticios. Los negocios se pueden eliminar fácilmente después.
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
                      <span className="font-medium">{result.business}</span>
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
