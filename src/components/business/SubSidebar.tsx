import { cn } from "@/lib/utils";
import { 
  Clock, 
  CheckCircle2, 
  DoorOpen, 
  Timer, 
  MessageSquare, 
  CalendarCheck,
  Info,
  Image,
  Globe,
  Utensils,
  StickyNote,
  Plus
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface SubSidebarProps {
  activeSection: string;
  activeSubSection: string;
  onSubSectionChange: (subSection: string) => void;
  businessId?: string;
  onCreateNote?: () => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: any;
  section: string;
}

export function SubSidebar({ activeSection, activeSubSection, onSubSectionChange, businessId, onCreateNote }: SubSidebarProps) {
  const [notes, setNotes] = useState<any[]>([]);
  const subMenuItems: SubMenuItem[] = [
    // Configuración submenu
    {
      id: "business-info",
      label: "Información del negocio",
      icon: Info,
      section: "settings",
    },
    {
      id: "restaurant-type",
      label: "Tipo de restaurante",
      icon: Utensils,
      section: "settings",
    },
    {
      id: "business-hours",
      label: "Horarios de apertura",
      icon: Clock,
      section: "settings",
    },
    {
      id: "auto-states",
      label: "Gestión automática",
      icon: CheckCircle2,
      section: "settings",
    },
    {
      id: "rooms",
      label: "Configuración de salas",
      icon: DoorOpen,
      section: "settings",
    },
    {
      id: "booking-duration",
      label: "Duración de reservas",
      icon: Timer,
      section: "settings",
    },
    {
      id: "booking-message",
      label: "Mensaje adicional",
      icon: MessageSquare,
      section: "settings",
    },
    {
      id: "booking-confirmation",
      label: "Confirmación de reservas",
      icon: CalendarCheck,
      section: "settings",
    },
    {
      id: "photo-gallery",
      label: "Galería de fotos",
      icon: Image,
      section: "settings",
    },
    {
      id: "website-social",
      label: "Web y redes sociales",
      icon: Globe,
      section: "settings",
    },
  ];

  useEffect(() => {
    if (activeSection === "notes" && businessId) {
      loadNotes();
    }
  }, [activeSection, businessId]);

  const loadNotes = async () => {
    if (!businessId) return;
    
    const { data, error } = await supabase
      .from("business_notes")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading notes:", error);
      return;
    }

    setNotes(data || []);
  };

  const visibleItems = subMenuItems.filter((item) => item.section === activeSection);

  if (activeSection === "notes") {
    return (
      <div className="w-[280px] h-full bg-card border-r border-border flex flex-col py-6 animate-slide-in-right">
        <div className="px-4 mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Notas
          </h3>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onCreateNote}
            className="h-7 w-7 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {notes.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <StickyNote className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                No hay notas aún
              </p>
            </div>
          ) : (
            notes.map((note) => {
              const isActive = activeSubSection === note.id;
              return (
                <button
                  key={note.id}
                  onClick={() => onSubSectionChange(note.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                    "hover:bg-accent",
                    isActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <StickyNote className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{note.title}</span>
                </button>
              );
            })
          )}
        </nav>
      </div>
    );
  }

  if (visibleItems.length === 0) return null;

  return (
    <div className="w-[280px] h-full bg-card border-r border-border flex flex-col py-6 animate-slide-in-right">
      <div className="px-4 mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Configuración
        </h3>
      </div>
      <nav className="flex-1 px-2 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSubSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSubSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                "hover:bg-accent",
                isActive && "bg-primary/10 text-primary font-medium"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}