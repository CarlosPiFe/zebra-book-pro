import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit2, Copy, Save, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotesViewProps {
  businessId: string;
  activeNoteId: string | null;
  onNoteChange: () => void;
}

interface Note {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const categories = [
  "Mantenimiento",
  "Stock",
  "Tareas pendientes",
  "Proveedores",
  "Personal",
  "Otro"
];

export function NotesView({ businessId, activeNoteId, onNoteChange }: NotesViewProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeNoteId) {
      loadNote();
    } else {
      setNote(null);
    }
  }, [activeNoteId]);

  const loadNote = async () => {
    if (!activeNoteId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("business_notes")
      .select("*")
      .eq("id", activeNoteId)
      .maybeSingle();

    if (error) {
      console.error("Error loading note:", error);
      toast.error("Error al cargar la nota");
    } else if (data) {
      setNote(data);
      setEditedTitle(data.title);
      setEditedContent(data.content || "");
      setEditedCategory(data.category || "none");
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (note) {
      setEditedTitle(note.title);
      setEditedContent(note.content || "");
      setEditedCategory(note.category || "none");
    }
  };

  const handleSave = async () => {
    if (!note || !editedTitle.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    const { error } = await supabase
      .from("business_notes")
      .update({
        title: editedTitle,
        content: editedContent,
        category: editedCategory && editedCategory !== "none" ? editedCategory : null,
      })
      .eq("id", note.id);

    if (error) {
      console.error("Error updating note:", error);
      toast.error("Error al actualizar la nota");
    } else {
      toast.success("Nota actualizada correctamente");
      setIsEditing(false);
      loadNote();
      onNoteChange();
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    const { error } = await supabase
      .from("business_notes")
      .delete()
      .eq("id", note.id);

    if (error) {
      console.error("Error deleting note:", error);
      toast.error("Error al eliminar la nota");
    } else {
      toast.success("Nota eliminada correctamente");
      setDeleteDialogOpen(false);
      onNoteChange();
    }
  };

  const handleDuplicate = async () => {
    if (!note) return;

    const { error } = await supabase
      .from("business_notes")
      .insert({
        business_id: businessId,
        title: `${note.title} (copia)`,
        content: note.content,
        category: note.category || null,
      });

    if (error) {
      console.error("Error duplicating note:", error);
      toast.error("Error al duplicar la nota");
    } else {
      toast.success("Nota duplicada correctamente");
      onNoteChange();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Selecciona una nota para ver su contenido</p>
          <p className="text-sm text-muted-foreground">
            o haz clic en el botón + para crear una nueva
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      placeholder="Título de la nota"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Categoría</Label>
                    <Select value={editedCategory || "none"} onValueChange={setEditedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin categoría</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle>{note.title}</CardTitle>
                  <CardDescription>
                    {note.category && (
                      <span className="inline-block px-2 py-1 text-xs rounded-md bg-primary/10 text-primary mr-2">
                        {note.category}
                      </span>
                    )}
                    Creada el {new Date(note.created_at).toLocaleDateString()}
                    {note.updated_at !== note.created_at && (
                      <> · Actualizada el {new Date(note.updated_at).toLocaleDateString()}</>
                    )}
                  </CardDescription>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={handleEdit}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDuplicate}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div>
              <Label htmlFor="content">Contenido</Label>
              <Textarea
                id="content"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Escribe el contenido de la nota..."
                rows={15}
                className="resize-none"
              />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {note.content ? (
                <p className="whitespace-pre-wrap">{note.content}</p>
              ) : (
                <p className="text-muted-foreground italic">Sin contenido</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que deseas eliminar esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La nota será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
