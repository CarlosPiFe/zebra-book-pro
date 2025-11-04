import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, LogOut, Briefcase, Store, PlusCircle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useEmployeeAccess } from "@/hooks/useEmployeeAccess";
import { useBusinessOwner } from "@/hooks/useBusinessOwner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateBusinessDialog } from "@/components/CreateBusinessDialog";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showCreateBusinessDialog, setShowCreateBusinessDialog] = useState(false);
  const { isEmployee, loading: employeeLoading } = useEmployeeAccess(user);
  const { hasBusinesses, loading: businessLoading } = useBusinessOwner(user);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      // Check if there's an active session first
      const { data: { session } } = await supabase.auth.getSession();
      
      // Only try to sign out if there's an active session
      if (session) {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
          console.error("Logout error:", error);
          toast.error("Error al cerrar sesión");
          return;
        }
      }
      
      // Clear user state immediately
      setUser(null);
      
      // Clear any localStorage items
      localStorage.clear();
      
      toast.success("Sesión cerrada correctamente");
      
      // Navigate to home and reload
      window.location.href = "/";
    } catch (error) {
      console.error("Unexpected logout error:", error);
      // Even if there's an error, clear everything and go to home
      setUser(null);
      localStorage.clear();
      window.location.href = "/";
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo - Izquierda */}
          <Link to="/" className="flex items-center gap-2 group">
            <Calendar className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <span className="text-2xl font-bold text-foreground">ZebraTime</span>
          </Link>

          {/* Botones - Derecha */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Botón de Perfil del Cliente (siempre visible si está logueado) */}
                {!businessLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    Mi perfil
                  </Button>
                )}

                {/* Botón Condicional: Mi negocio / Registrar negocio */}
                {!businessLoading && (
                  <Button
                    variant={hasBusinesses ? "default" : "outline"}
                    size="sm"
                    onClick={() => hasBusinesses ? navigate("/dashboard") : setShowCreateBusinessDialog(true)}
                    className="gap-2"
                  >
                    {hasBusinesses ? (
                      <>
                        <Store className="h-4 w-4" />
                        Mi negocio
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        ¿Tienes un negocio?
                      </>
                    )}
                  </Button>
                )}

                {/* Portal de Empleado (solo si es empleado) */}
                {isEmployee && !employeeLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/employee-portal")}
                    className="gap-2"
                  >
                    <Briefcase className="h-4 w-4" />
                    Portal Empleado
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoutDialog(true)}
                  className="gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Salir
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                >
                  Iniciar sesión
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/auth?mode=signup")}
                >
                  Registrarse
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cerrar sesión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>
              Cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateBusinessDialog 
        open={showCreateBusinessDialog} 
        onOpenChange={setShowCreateBusinessDialog}
      />
    </nav>
  );
};
