import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { CalendarView } from "@/components/business/CalendarView";
import { BookingsView } from "@/components/business/BookingsView";
import { TablesView } from "@/components/business/TablesView";
import { MenuView } from "@/components/business/MenuView";
import { EmployeesView } from "@/components/business/EmployeesView";
import { WeeklyScheduleView } from "@/components/business/WeeklyScheduleView";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MainSidebar } from "@/components/business/MainSidebar";
import { SubSidebar } from "@/components/business/SubSidebar";
import { SettingsContent } from "@/components/business/SettingsContent";

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
  cuisine_type?: string | null;
  price_range?: string | null;
  special_offer?: string | null;
  dietary_options?: string[] | null;
  service_types?: string[] | null;
  dish_specialties?: string[] | null;
  seo_keywords?: string | null;
}

const ManageBusiness = () => {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeView, setActiveView] = useState(() => {
    return searchParams.get("view") || "calendar";
  });
  const [activeSubSection, setActiveSubSection] = useState<string>("business-info");
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

  const handleSectionChange = (section: string) => {
    setActiveView(section);
    if (section === "settings") {
      setActiveSubSection("business-info");
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
        return <SettingsContent business={business} activeSubSection={activeSubSection} onUpdate={loadBusiness} />;
      case "statistics":
        return (
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Estadísticas - Próximamente</p>
          </div>
        );
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
      
      <div className="flex h-screen pt-16">
        <MainSidebar
          activeSection={activeView}
          onSectionChange={handleSectionChange}
        />
        
        {activeView === "settings" && (
          <SubSidebar
            activeSection={activeView}
            activeSubSection={activeSubSection}
            onSubSectionChange={setActiveSubSection}
          />
        )}
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManageBusiness;
