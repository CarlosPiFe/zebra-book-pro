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
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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
  booking_additional_message?: string | null;
  schedule_view_mode?: string;
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

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
        .eq("id", businessId ?? "")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        toast.error("Negocio no encontrado");
        navigate("/dashboard");
        return;
      }

      setBusiness(data as any);
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
        return <WeeklyScheduleView businessId={business.id} scheduleViewMode={business.schedule_view_mode || 'editable'} />;
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
        <LoadingSpinner fullScreen />
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
          
          <main className="flex-1 flex flex-col">
            <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
              {renderView()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
};

export default ManageBusiness;
