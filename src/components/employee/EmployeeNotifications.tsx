import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmployeeNotificationsProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeNotifications = ({ employeeId, businessId }: EmployeeNotificationsProps) => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('employee-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employee_notifications',
          filter: `employee_id=eq.${employeeId}`
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employee_notifications")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.error("Error al cargar notificaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("employee_notifications")
        .update({ read: true })
        .eq("id", id);

      if (error) throw error;
      await loadNotifications();
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Error al marcar como leída");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("employee_notifications")
        .update({ read: true })
        .eq("employee_id", employeeId)
        .eq("read", false);

      if (error) throw error;
      await loadNotifications();
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Error al marcar todas como leídas");
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="animate-pulse h-96 bg-muted rounded" />;
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Header - Más compacto en móvil */}
      <Card className="p-3 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center relative flex-shrink-0">
              <Bell className="w-6 h-6 md:w-8 md:h-8 text-primary" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 md:h-6 md:w-6 rounded-full p-0 flex items-center justify-center text-[10px] md:text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Notificaciones</p>
              <p className="text-2xl md:text-3xl font-bold">{unreadCount} sin leer</p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm" className="w-full sm:w-auto">
              <Check className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2" />
              <span className="text-xs md:text-sm">Marcar todas</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Notifications List - Con collapsibles */}
      <Card className="p-3 md:p-6">
        <div className="space-y-2">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <Collapsible key={notification.id}>
                <Card className={`p-0 overflow-hidden ${
                  notification.read ? "" : "border-primary/30"
                }`}>
                  <CollapsibleTrigger className={`w-full p-3 md:p-4 text-left hover:bg-muted/50 transition-colors ${
                    notification.read ? "" : "bg-primary/5"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-xs md:text-sm font-medium truncate">{notification.title}</p>
                          {!notification.read && (
                            <Badge variant="default" className="h-4 text-[10px] px-1.5">Nuevo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: es })}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <ChevronDown className="w-4 h-4 text-muted-foreground md:hidden" />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="px-3 pb-3 md:px-4 md:pb-4 pt-2 border-t bg-muted/20">
                      <p className="text-xs md:text-sm text-foreground whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.created_at), "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                      </p>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          ) : (
            <div className="text-center py-6 md:py-8 text-muted-foreground">
              <Bell className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">No tienes notificaciones</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
