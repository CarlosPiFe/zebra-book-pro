import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Calendar, DollarSign, Bell, User, Building2 } from "lucide-react";
import { EmployeeDashboard } from "@/components/employee/EmployeeDashboard";
import { EmployeeScheduleView } from "@/components/employee/EmployeeScheduleView";
import { EmployeeTimesheets } from "@/components/employee/EmployeeTimesheets";
import { EmployeePayroll } from "@/components/employee/EmployeePayroll";
import { EmployeeNotifications } from "@/components/employee/EmployeeNotifications";
import { EmployeeProfile } from "@/components/employee/EmployeeProfile";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
        setSelectedWorkplace(workplacesList[0] ?? null);
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
        <LoadingSpinner fullScreen />
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
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Portal de Empleado</h1>
              <p className="text-muted-foreground">Bienvenido, {user?.email}</p>
            </div>
            
            {workplaces.length > 1 && (
              <select
                value={selectedWorkplace?.id}
                onChange={(e) => {
                  const wp = workplaces.find(w => w.id === e.target.value);
                  setSelectedWorkplace(wp || null);
                }}
                className="px-4 py-2 border rounded-lg bg-background"
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
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedWorkplace.name}</span>
                <span className="text-sm text-muted-foreground">• {selectedWorkplace.position}</span>
              </div>
            </Card>
          )}
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeView === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveView("dashboard")}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Inicio
          </Button>
          <Button
            variant={activeView === "schedule" ? "default" : "outline"}
            onClick={() => setActiveView("schedule")}
            className="flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Mi Horario
          </Button>
          <Button
            variant={activeView === "timesheets" ? "default" : "outline"}
            onClick={() => setActiveView("timesheets")}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Fichajes
          </Button>
          <Button
            variant={activeView === "payroll" ? "default" : "outline"}
            onClick={() => setActiveView("payroll")}
            className="flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Nóminas
          </Button>
          <Button
            variant={activeView === "notifications" ? "default" : "outline"}
            onClick={() => setActiveView("notifications")}
            className="flex items-center gap-2"
          >
            <Bell className="w-4 h-4" />
            Notificaciones
          </Button>
          <Button
            variant={activeView === "profile" ? "default" : "outline"}
            onClick={() => setActiveView("profile")}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Perfil
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
