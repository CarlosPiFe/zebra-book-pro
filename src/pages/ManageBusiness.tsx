import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/BusinessSidebar";
import { Navbar } from "@/components/Navbar";
import { CalendarView } from "@/components/business/CalendarView";
import { BookingsView } from "@/components/business/BookingsView";
import { TablesView } from "@/components/business/TablesView";
import { MenuView } from "@/components/business/MenuView";
import { EmployeesView } from "@/components/business/EmployeesView";
import { WeeklyScheduleView } from "@/components/business/WeeklyScheduleView";
import { BusinessSettings } from "@/components/business/BusinessSettings";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  image_url: string;
  booking_slot_duration_minutes: number;
  website: string | null;
  social_media: any;
}

const ManageBusiness = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeView, setActiveView] = useState(() => {
    return searchParams.get("view") || "calendar";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  useEffect(() => {
    const view = searchParams.get("view");
    if (view) {
      setActiveView(view);
    }
  }, [searchParams]);

  const loadBusiness = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("owner_id", session.user.id)
        .single();

      if (error) throw error;
      
      if (!data) {
        toast.error("Negocio no encontrado");
        navigate("/dashboard");
        return;
      }

      setBusiness(data);
    } catch (error) {
      console.error("Error loading business:", error);
      toast.error("Error al cargar el negocio");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const renderView = () => {
    if (!business) return null;

    switch (activeView) {
      case "calendar":
        return <CalendarView businessId={business.id} />;
      case "bookings":
        return <BookingsView businessId={business.id} businessName={business.name} />;
      case "tables":
        return <TablesView businessId={business.id} />;
      case "menu":
        return <MenuView businessId={business.id} />;
      case "employees":
        return <EmployeesView businessId={business.id} />;
      case "schedules":
        return <WeeklyScheduleView businessId={business.id} />;
      case "settings":
        return <BusinessSettings business={business} onUpdate={loadBusiness} />;
      default:
        return <CalendarView businessId={business.id} />;
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <SidebarProvider>
        <div className="flex min-h-screen w-full pt-24">
          <BusinessSidebar
            business={business}
            activeView={activeView}
            onViewChange={setActiveView}
          />
          
          <main className="flex-1 p-6 md:p-8">
            {renderView()}
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default ManageBusiness;
