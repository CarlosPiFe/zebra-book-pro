import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface EmployeeDashboardProps {
  employeeId: string;
  businessId: string;
}

export const EmployeeDashboard = ({ employeeId, businessId }: EmployeeDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState<any>(null);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [weekHours, setWeekHours] = useState(0);
  const [latestPayroll, setLatestPayroll] = useState<any>(null);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [employeeId, businessId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCurrentTimesheet(),
        loadTodaySchedule(),
        loadWeekHours(),
        loadLatestPayroll(),
        loadUpcomingShifts()
      ]);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentTimesheet = async () => {
    const { data } = await supabase
      .from("timesheets")
      .select("*")
      .eq("employee_id", employeeId)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setClockedIn(true);
      setCurrentTimesheet(data);
    }
  };

  const loadTodaySchedule = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("employee_weekly_schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .eq("date", today)
      .eq("is_day_off", false)
      .single();

    setTodaySchedule(data);
  };

  const loadWeekHours = async () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const { data } = await supabase
      .from("timesheets")
      .select("duration_minutes")
      .eq("employee_id", employeeId)
      .gte("clock_in", startOfWeek.toISOString())
      .not("clock_out", "is", null);

    const totalMinutes = data?.reduce((sum, t) => sum + (t.duration_minutes || 0), 0) || 0;
    setWeekHours(Math.round(totalMinutes / 60 * 10) / 10);
  };

  const loadLatestPayroll = async () => {
    const { data } = await supabase
      .from("payroll_records")
      .select("*")
      .eq("employee_id", employeeId)
      .order("period_end", { ascending: false })
      .limit(1)
      .single();

    setLatestPayroll(data);
  };

  const loadUpcomingShifts = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("employee_weekly_schedules")
      .select("*")
      .eq("employee_id", employeeId)
      .gte("date", today)
      .eq("is_day_off", false)
      .order("date", { ascending: true })
      .limit(5);

    setUpcomingShifts(data || []);
  };

  const handleClockIn = async () => {
    try {
      const { error } = await supabase
        .from("timesheets")
        .insert({
          employee_id: employeeId,
          business_id: businessId,
          clock_in: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Fichaje de entrada registrado");
      await loadDashboardData();
    } catch (error) {
      console.error("Error clocking in:", error);
      toast.error("Error al fichar entrada");
    }
  };

  const handleClockOut = async () => {
    if (!currentTimesheet) return;

    try {
      const { error } = await supabase
        .from("timesheets")
        .update({
          clock_out: new Date().toISOString()
        })
        .eq("id", currentTimesheet.id);

      if (error) throw error;

      toast.success("Fichaje de salida registrado");
      await loadDashboardData();
    } catch (error) {
      console.error("Error clocking out:", error);
      toast.error("Error al fichar salida");
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
        <div className="h-24 bg-muted rounded" />
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Clock In/Out Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              clockedIn ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
            }`}>
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">
                {clockedIn ? "Fichado" : "No fichado"}
              </h3>
              {currentTimesheet && (
                <p className="text-sm text-muted-foreground">
                  Entrada: {format(new Date(currentTimesheet.clock_in), "HH:mm", { locale: es })}
                </p>
              )}
            </div>
          </div>
          
          <Button
            size="lg"
            onClick={clockedIn ? handleClockOut : handleClockIn}
            className={clockedIn ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            {clockedIn ? "Fichar Salida" : "Fichar Entrada"}
          </Button>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Turno de hoy</p>
              <p className="text-xl font-semibold">
                {todaySchedule 
                  ? `${todaySchedule.start_time} - ${todaySchedule.end_time}`
                  : "Sin turno"}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Horas esta semana</p>
              <p className="text-xl font-semibold">{weekHours}h</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Última nómina</p>
              <p className="text-xl font-semibold">
                {latestPayroll 
                  ? `${latestPayroll.net_amount}€`
                  : "Sin nóminas"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Shifts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Próximos turnos</h3>
        {upcomingShifts.length > 0 ? (
          <div className="space-y-2">
            {upcomingShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {format(new Date(shift.date), "EEEE, d MMMM", { locale: es })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {shift.start_time} - {shift.end_time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No tienes turnos programados</p>
          </div>
        )}
      </Card>
    </div>
  );
};
