import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Copy, Check, X, Palette } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RichTextEditor } from "./RichTextEditor";
import { useDebounce } from "@/hooks/useDebounce";

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
  color: string;
  created_at: string;
  updated_at: string;
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

export function NotesView({ businessId, activeNoteId, onNoteChange }: NotesViewProps) {
  const [note, setNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const debouncedContent = useDebounce(editedContent, 1000);

  useEffect(() => {
    if (activeNoteId) {
      loadNote();
    } else {
      setNote(null);
    }
  }, [activeNoteId]);

  useEffect(() => {
    if (note && debouncedContent !== note.content && debouncedContent !== "") {
      saveContent();
    }
  }, [debouncedContent]);

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
      setNote({
        ...data,
        color: data.color || "#3b82f6"
      });
      setEditedContent(data.content || "");
      setEditedTitle(data.title);
    }
    setLoading(false);
  };

  const saveContent = async () => {
    if (!note) return;

    setIsSaving(true);
    const { error } = await supabase
      .from("business_notes")
      .update({
        content: editedContent,
      })
      .eq("id", note.id);

    if (error) {
      console.error("Error saving note:", error);
      toast.error("Error al guardar");
    }
    setIsSaving(false);
  };

  const handleRenameTitle = async () => {
    if (!note || !editedTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }

    const { error } = await supabase
      .from("business_notes")
      .update({
        title: editedTitle.trim(),
      })
      .eq("id", note.id);

    if (error) {
      console.error("Error renaming note:", error);
      toast.error("Error al renombrar la nota");
    } else {
      toast.success("Nota renombrada");
      setIsRenamingTitle(false);
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
        color: note.color,
      });

    if (error) {
      console.error("Error duplicating note:", error);
      toast.error("Error al duplicar la nota");
    } else {
      toast.success("Nota duplicada correctamente");
      onNoteChange();
    }
  };

  const handleColorChange = async (color: string) => {
    if (!note) return;

    const { error } = await supabase
      .from("business_notes")
      .update({ color })
      .eq("id", note.id);

    if (error) {
      console.error("Error updating color:", error);
      toast.error("Error al cambiar el color");
    } else {
      setNote({ ...note, color });
      onNoteChange();
    }
  };

  const handleCancelRename = () => {
    setIsRenamingTitle(false);
    if (note) {
      setEditedTitle(note.title);
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
          <p className="text-muted-foreground mb-2">
            Aún no tienes notas. Crea una nueva para empezar.
          </p>
          <p className="text-sm text-muted-foreground">
            Haz clic en el botón + para crear tu primera nota
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: note.color }}
          />
          {isRenamingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="max-w-md"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameTitle();
                  } else if (e.key === "Escape") {
                    handleCancelRename();
                  }
                }}
              />
              <Button size="sm" onClick={handleRenameTitle}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelRename}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">{note.title}</h2>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRenamingTitle(true)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-muted-foreground">Guardando...</span>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                <Palette className="w-4 h-4 mr-2" />
                Color
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="space-y-2">
                <p className="text-sm font-medium">Color de la nota</p>
                <div className="grid grid-cols-4 gap-2">
                  {noteColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleColorChange(color.value)}
                      className="group relative"
                    >
                      <div
                        className={`w-full h-10 rounded-lg transition-all ${
                          note.color === color.value
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
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="outline" onClick={handleDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        Creada el {new Date(note.created_at).toLocaleDateString()} a las{" "}
        {new Date(note.created_at).toLocaleTimeString()}
        {note.updated_at !== note.created_at && (
          <>
            {" · "}
            Actualizada el {new Date(note.updated_at).toLocaleDateString()} a las{" "}
            {new Date(note.updated_at).toLocaleTimeString()}
          </>
        )}
      </div>

      <RichTextEditor
        content={editedContent}
        onUpdate={setEditedContent}
        placeholder="Empieza a escribir tu nota aquí..."
        noteId={note.id}
      />

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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
