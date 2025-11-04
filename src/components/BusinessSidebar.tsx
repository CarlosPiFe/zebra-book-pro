import { Building2, Calendar, ClipboardList, UtensilsCrossed, LayoutGrid, Users, Settings, Clock } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface Business {
  id: string;
  name: string;
  category: string;
}

interface BusinessSidebarProps {
  business: Business | null;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function BusinessSidebar({ business, activeView, onViewChange }: BusinessSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isRestaurant = business?.category === "restaurante" || 
                       business?.category === "cafeteria" || 
                       business?.category === "bar";

  const mainItems = [
    { id: "calendar", label: "Calendario", icon: Calendar },
    { id: "bookings", label: "Reservas", icon: ClipboardList },
    { id: "employees", label: "Empleados", icon: Users },
    { id: "schedules", label: "Horarios", icon: Clock },
  ];

  const restaurantItems = isRestaurant ? [
    { id: "tables", label: "Mesas", icon: LayoutGrid },
    { id: "menu", label: "Menú", icon: UtensilsCrossed },
  ] : [];

  return (
    <Sidebar collapsible="icon" className="w-52">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        {business && !isCollapsed && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold leading-snug mb-1.5">{business.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{business.category}</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Gestión</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onViewChange(item.id)}
                    isActive={activeView === item.id}
                    className={activeView === item.id ? "bg-accent/10 text-accent" : ""}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isRestaurant && restaurantItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Restauración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {restaurantItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onViewChange(item.id)}
                      isActive={activeView === item.id}
                      className={activeView === item.id ? "bg-accent/10 text-accent" : ""}
                    >
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewChange("settings")}
                  isActive={activeView === "settings"}
                  className={activeView === "settings" ? "bg-accent/10 text-accent" : ""}
                >
                  <Settings className="h-4 w-4" />
                  {!isCollapsed && <span>Configuración</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
