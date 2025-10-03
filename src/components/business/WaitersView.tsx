import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Plus, Trash2, UserPlus } from "lucide-react";

interface Waiter {
  id: string;
  name: string;
  token: string;
  is_active: boolean;
  created_at: string;
}

interface WaitersViewProps {
  businessId: string;
}

export const WaitersView = ({ businessId }: WaitersViewProps) => {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWaiterName, setNewWaiterName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadWaiters();
  }, [businessId]);

  const loadWaiters = async () => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWaiters(data || []);
    } catch (error) {
      console.error("Error loading waiters:", error);
      toast.error("Error al cargar camareros");
    } finally {
      setLoading(false);
    }
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateWaiter = async () => {
    if (!newWaiterName.trim()) {
      toast.error("Por favor ingresa un nombre");
      return;
    }

    try {
      const token = generateToken();
      const { error } = await supabase
        .from("waiters")
        .insert({
          business_id: businessId,
          name: newWaiterName.trim(),
          token: token,
        });

      if (error) throw error;

      toast.success("Camarero creado exitosamente");
      setNewWaiterName("");
      setIsDialogOpen(false);
      loadWaiters();
    } catch (error) {
      console.error("Error creating waiter:", error);
      toast.error("Error al crear camarero");
    }
  };

  const handleDeleteWaiter = async (waiterId: string) => {
    try {
      const { error } = await supabase
        .from("waiters")
        .delete()
        .eq("id", waiterId);

      if (error) throw error;

      toast.success("Camarero eliminado");
      loadWaiters();
    } catch (error) {
      console.error("Error deleting waiter:", error);
      toast.error("Error al eliminar camarero");
    }
  };

  const copyWaiterLink = (token: string) => {
    const link = `${window.location.origin}/waiter/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado al portapapeles");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Camareros</h2>
          <p className="text-muted-foreground">Gestiona los camareros de tu restaurante</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Camarero
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Camarero</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="waiterName">Nombre del Camarero</Label>
                <Input
                  id="waiterName"
                  value={newWaiterName}
                  onChange={(e) => setNewWaiterName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <Button onClick={handleCreateWaiter} className="w-full">
                <UserPlus className="w-4 h-4 mr-2" />
                Crear Camarero
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {waiters.length === 0 ? (
        <Card className="p-8 text-center">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay camareros</h3>
          <p className="text-muted-foreground mb-4">
            Agrega tu primer camarero para comenzar
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {waiters.map((waiter) => (
            <Card key={waiter.id} className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{waiter.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Creado: {new Date(waiter.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyWaiterLink(waiter.token)}
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Link
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteWaiter(waiter.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
