import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateNoteDialogProps {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNoteCreated: (noteId: string) => void;
}

export function CreateNoteDialog({
  businessId,
  open,
  onOpenChange,
  onNoteCreated,
}: CreateNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("business_notes")
      .insert({
        business_id: businessId,
        title: title.trim(),
        content: "",
        category: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      toast.error("Error al crear la nota");
    } else if (data) {
      toast.success("Nota creada correctamente");
      setTitle("");
      onOpenChange(false);
      onNoteCreated(data.id);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nueva nota</DialogTitle>
          <DialogDescription>
            Escribe un nombre para tu nueva nota
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Nombre de la nota *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Tareas pendientes, Proveedores..."
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear nota"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
