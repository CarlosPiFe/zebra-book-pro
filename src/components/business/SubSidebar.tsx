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
  Globe
} from "lucide-react";

interface SubSidebarProps {
  activeSection: string;
  activeSubSection: string;
  onSubSectionChange: (subSection: string) => void;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: any;
  section: string;
}

export function SubSidebar({ activeSection, activeSubSection, onSubSectionChange }: SubSidebarProps) {
  const subMenuItems: SubMenuItem[] = [
    // Configuración submenu
    {
      id: "business-info",
      label: "Información del negocio",
      icon: Info,
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

  const visibleItems = subMenuItems.filter((item) => item.section === activeSection);

  if (visibleItems.length === 0) return null;

  return (
    <div className="w-[220px] h-full bg-card border-r border-border flex flex-col py-6 animate-slide-in-right">
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
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}