import { Calendar, ClipboardList, Users, Clock, Settings, BarChart3, UtensilsCrossed, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MainSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  businessCategory: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  showForCategory?: string[];
  hasSubmenu?: boolean;
}

export function MainSidebar({ activeSection, onSectionChange, businessCategory }: MainSidebarProps) {
  const navItems: NavItem[] = [
    {
      id: "calendar",
      label: "Calendario",
      icon: Calendar,
      hasSubmenu: false,
    },
    {
      id: "bookings",
      label: "Reservas",
      icon: ClipboardList,
      hasSubmenu: false,
    },
    {
      id: "tables",
      label: "Mesas",
      icon: TableProperties,
      showForCategory: ["restaurante", "bar", "cafetería"],
      hasSubmenu: false,
    },
    {
      id: "menu",
      label: "Menú",
      icon: UtensilsCrossed,
      showForCategory: ["restaurante", "bar", "cafetería"],
      hasSubmenu: false,
    },
    {
      id: "employees",
      label: "Empleados",
      icon: Users,
      hasSubmenu: false,
    },
    {
      id: "schedules",
      label: "Horarios",
      icon: Clock,
      hasSubmenu: false,
    },
    {
      id: "settings",
      label: "Configuración",
      icon: Settings,
      hasSubmenu: true,
    },
    {
      id: "statistics",
      label: "Estadísticas",
      icon: BarChart3,
      hasSubmenu: false,
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.showForCategory || item.showForCategory.includes(businessCategory.toLowerCase())
  );

  return (
    <div className="w-[70px] h-full bg-card border-r border-border flex flex-col items-center py-6 gap-2">
      <TooltipProvider delayDuration={100}>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-200",
                    "hover:bg-accent hover:scale-110",
                    isActive && "bg-primary text-primary-foreground shadow-lg scale-105"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}