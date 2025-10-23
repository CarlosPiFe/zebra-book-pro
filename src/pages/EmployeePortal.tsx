import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, DollarSign, FileText, Bell, User, Building2 } from "lucide-react";
import { EmployeeDashboard } from "@/components/employee/EmployeeDashboard";
import { EmployeeScheduleView } from "@/components/employee/EmployeeScheduleView";
import { EmployeeTimesheets } from "@/components/employee/EmployeeTimesheets";
import { EmployeePayroll } from "@/components/employee/EmployeePayroll";
import { EmployeeNotifications } from "@/components/employee/EmployeeNotifications";
import { EmployeeProfile } from "@/components/employee/EmployeeProfile";

interface EmployeeWorkplace {
  id: string;
  name: string;
  business_id: string;
  position: string;
}

const EmployeePortal = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workplaces, setWorkplaces] = useState<EmployeeWorkplace[]>([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState<EmployeeWorkplace | null>(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Debes iniciar sesión para acceder al portal de empleado");
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await loadWorkplaces(session.user);
    } catch (error) {
      console.error("Error checking auth:", error);
      toast.error("Error al verificar autenticación");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkplaces = async (user: any) => {
    try {
      const { data, error } = await supabase
        .from("waiters")
        .select(`
          id,
          name,
          business_id,
          position,
          businesses!inner (
            id,
            name
          )
        `)
        .eq("email", user.email)
        .eq("is_active", true);

      if (error) throw error;

      const workplacesList = data?.map((w: any) => ({
        id: w.id,
        name: w.businesses.name,
        business_id: w.business_id,
        position: w.position || "Empleado"
      })) || [];

      setWorkplaces(workplacesList);
      
      if (workplacesList.length > 0) {
        setSelectedWorkplace(workplacesList[0]);
      } else {
        toast.error("No tienes negocios asignados");
      }
    } catch (error) {
      console.error("Error loading workplaces:", error);
      toast.error("Error al cargar tus lugares de trabajo");
    }
  };

  const renderView = () => {
    if (!selectedWorkplace) return null;

    switch (activeView) {
      case "dashboard":
        return <EmployeeDashboard employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
      case "schedule":
        return <EmployeeScheduleView employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
      case "timesheets":
        return <EmployeeTimesheets employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
      case "payroll":
        return <EmployeePayroll employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
      case "notifications":
        return <EmployeeNotifications employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
      case "profile":
        return <EmployeeProfile employeeId={selectedWorkplace.id} />;
      default:
        return <EmployeeDashboard employeeId={selectedWorkplace.id} businessId={selectedWorkplace.business_id} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (workplaces.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-24">
          <Card className="p-8 text-center">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No tienes lugares de trabajo asignados</h2>
            <p className="text-muted-foreground mb-4">
              Contacta con tu administrador para que te asigne a un negocio.
            </p>
            <Button onClick={() => navigate("/")}>Volver al inicio</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header con selector de negocio */}
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h1 className="text-xl md:text-3xl font-bold">Portal de Empleado</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{user?.email}</p>
            </div>
            
            {workplaces.length > 1 && (
              <select
                value={selectedWorkplace?.id}
                onChange={(e) => {
                  const wp = workplaces.find(w => w.id === e.target.value);
                  setSelectedWorkplace(wp || null);
                }}
                className="px-3 py-1.5 md:px-4 md:py-2 text-sm border rounded-lg bg-background"
              >
                {workplaces.map(wp => (
                  <option key={wp.id} value={wp.id}>
                    {wp.name} - {wp.position}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedWorkplace && (
            <Card className="p-2.5 md:p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                <span className="text-sm md:text-base font-medium">{selectedWorkplace.name}</span>
                <span className="text-xs md:text-sm text-muted-foreground">• {selectedWorkplace.position}</span>
              </div>
            </Card>
          )}
        </div>

        {/* Navigation - Compacta en móvil */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
          <Button
            variant={activeView === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveView("dashboard")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Button>
          <Button
            variant={activeView === "schedule" ? "default" : "outline"}
            onClick={() => setActiveView("schedule")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Horario</span>
          </Button>
          <Button
            variant={activeView === "timesheets" ? "default" : "outline"}
            onClick={() => setActiveView("timesheets")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Fichajes</span>
          </Button>
          <Button
            variant={activeView === "payroll" ? "default" : "outline"}
            onClick={() => setActiveView("payroll")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Nóminas</span>
          </Button>
          <Button
            variant={activeView === "notifications" ? "default" : "outline"}
            onClick={() => setActiveView("notifications")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <Bell className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Notif.</span>
          </Button>
          <Button
            variant={activeView === "profile" ? "default" : "outline"}
            onClick={() => setActiveView("profile")}
            size="sm"
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4"
          >
            <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Perfil</span>
          </Button>
        </div>

        {/* Content */}
        <div>
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;
