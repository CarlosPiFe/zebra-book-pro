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
