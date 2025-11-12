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

const noteColors = [
  { value: "#3b82f6", label: "Azul" },
  { value: "#10b981", label: "Verde" },
  { value: "#f59e0b", label: "Naranja" },
  { value: "#ef4444", label: "Rojo" },
  { value: "#8b5cf6", label: "Morado" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#06b6d4", label: "Cian" },
  { value: "#6b7280", label: "Gris" },
];

export function CreateNoteDialog({
  businessId,
  open,
  onOpenChange,
  onNoteCreated,
}: CreateNoteDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
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
        color: selectedColor,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      toast.error("Error al crear la nota");
    } else if (data) {
      toast.success("Nota creada correctamente");
      setTitle("");
      setSelectedColor("#3b82f6");
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
          <div>
            <Label>Color de la nota</Label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {noteColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className="group relative"
                >
                  <div
                    className={`w-full h-10 rounded-lg transition-all ${
                      selectedColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="text-xs mt-1 block text-center text-muted-foreground">
                    {color.label}
                  </span>
                </button>
              ))}
            </div>
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
