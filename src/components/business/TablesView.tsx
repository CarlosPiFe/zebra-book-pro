import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
}

interface TablesViewProps {
  businessId: string;
}

export function TablesView({ businessId }: TablesViewProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");

  useEffect(() => {
    loadTables();
  }, [businessId]);

  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Error al cargar las mesas");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableNumber || !maxCapacity) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      const { error } = await supabase.from("tables").insert({
        business_id: businessId,
        table_number: parseInt(tableNumber),
        max_capacity: parseInt(maxCapacity),
      });

      if (error) throw error;

      toast.success("Mesa añadida correctamente");
      setIsDialogOpen(false);
      setTableNumber("");
      setMaxCapacity("");
      loadTables();
    } catch (error: any) {
      console.error("Error adding table:", error);
      if (error.code === "23505") {
        toast.error("Ya existe una mesa con ese número");
      } else {
        toast.error("Error al añadir la mesa");
      }
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    try {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);

      if (error) throw error;

      toast.success("Mesa eliminada correctamente");
      loadTables();
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Error al eliminar la mesa");
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando mesas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-background min-h-screen">
      <h1 className="text-xl font-semibold">Gestión de Mesas</h1>

      {tables.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors bg-card">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <span className="text-lg font-medium text-muted-foreground">Añadir Mesa</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nueva Mesa</DialogTitle>
                <DialogDescription>
                  Completa la información de la mesa
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="table-number">Número de Mesa</Label>
                  <Input
                    id="table-number"
                    type="number"
                    placeholder="Ej: 1"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                  <Input
                    id="max-capacity"
                    type="number"
                    placeholder="Ej: 4"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTable}>Añadir Mesa</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Mesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir Nueva Mesa</DialogTitle>
                  <DialogDescription>
                    Completa la información de la mesa
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number">Número de Mesa</Label>
                    <Input
                      id="table-number"
                      type="number"
                      placeholder="Ej: 1"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                    <Input
                      id="max-capacity"
                      type="number"
                      placeholder="Ej: 4"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddTable}>Añadir Mesa</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="relative aspect-square border-2 border-border rounded-lg bg-card p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow group"
              >
                <button
                  onClick={() => handleDeleteTable(table.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
                <div className="text-3xl font-bold text-primary">
                  {table.table_number}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{table.max_capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
