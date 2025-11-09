import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Calendar, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface Employee {
  id: string;
  name: string;
  position?: string;
  vacationCount?: number;
}

interface EmployeesOverviewProps {
  employees: Employee[];
}

export const EmployeesOverview = ({ employees }: EmployeesOverviewProps) => {
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    
    // Agrupar por puesto
    const positionCounts: Record<string, number> = {};
    employees.forEach(emp => {
      const position = emp.position || "Sin cargo asignado";
      positionCounts[position] = (positionCounts[position] || 0) + 1;
    });
    
    // Empleados con vacaciones
    const employeesWithVacations = employees.filter(emp => (emp.vacationCount || 0) > 0).length;
    
    // Empleados sin cargo asignado
    const employeesWithoutPosition = employees.filter(emp => !emp.position).length;
    
    return {
      totalEmployees,
      positionCounts,
      employeesWithVacations,
      employeesWithoutPosition,
    };
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Resumen General</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Total de Empleados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEmployees === 1 ? "Empleado activo" : "Empleados activos"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Con Vacaciones
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employeesWithVacations}</div>
            <p className="text-xs text-muted-foreground">
              Tienen períodos de vacaciones registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Puestos Definidos
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalEmployees - stats.employeesWithoutPosition}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.employeesWithoutPosition > 0 
                ? `${stats.employeesWithoutPosition} sin cargo asignado`
                : "Todos tienen cargo asignado"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Cargos Diferentes
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats.positionCounts).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipos de puestos en el equipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribution by Position */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución por Cargo</CardTitle>
          <CardDescription>
            Número de empleados por puesto de trabajo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.positionCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay empleados registrados
            </p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.positionCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([position, count]) => {
                  const percentage = ((count / stats.totalEmployees) * 100).toFixed(1);
                  return (
                    <div key={position} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{position}</span>
                        <span className="text-muted-foreground">
                          {count} {count === 1 ? "empleado" : "empleados"} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Gestiona tu equipo de forma eficiente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            • Haz clic en un empleado de la lista para ver su información detallada
          </p>
          <p className="text-sm text-muted-foreground">
            • Usa el botón "Agregar Empleado" para añadir nuevos miembros al equipo
          </p>
          <p className="text-sm text-muted-foreground">
            • Gestiona horarios, vacaciones y nóminas desde el perfil de cada empleado
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
