import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Briefcase, Store, PlusCircle, User, MapPin, Search } from "lucide-react";
import zebraLogo from "@/assets/zebra-logo.svg";
import zebraLogoManager from "@/assets/zebra-logo-manager.svg";
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
  const location = useLocation();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showCreateBusinessDialog, setShowCreateBusinessDialog] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [searchType, setSearchType] = useState("");
  const { isEmployee, loading: employeeLoading } = useEmployeeAccess(user);
  const { hasBusinesses, loading: businessLoading } = useBusinessOwner(user);

  // Detectar si estamos en páginas de gestión
  const isManagerPage = location.pathname.startsWith('/dashboard') || 
                        location.pathname.startsWith('/manage-business') || 
                        location.pathname.startsWith('/employee-portal') ||
                        location.pathname.startsWith('/waiter-interface');

  // Detectar si estamos en la página principal
  const isHomePage = location.pathname === '/';

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

  useEffect(() => {
    if (!isHomePage) return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  const handleCompactSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.set("location", searchLocation);
    if (searchType) params.set("type", searchType);
    navigate(`/search?${params.toString()}`);
  };

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
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      isScrolled && isHomePage 
        ? 'bg-background shadow-md' 
        : 'bg-card/95 backdrop-blur-lg border-b shadow-sm'
    }`}>
      <div className="w-full px-6">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo - Izquierda */}
          <Link to="/" className="flex items-center group shrink-0">
            <img 
              src={isManagerPage ? zebraLogoManager : zebraLogo} 
              alt="ZebraTime Logo" 
              className="h-16 transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Buscador Compacto - Centro (solo visible al hacer scroll en home) */}
          {isScrolled && isHomePage && (
            <div className="flex-1 max-w-2xl mx-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ubicación"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCompactSearch()}
                    className="pl-10 h-10"
                  />
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tipo de restaurante"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCompactSearch()}
                    className="pl-10 h-10"
                  />
                </div>
                <Button onClick={handleCompactSearch} size="sm" className="h-10">
                  Buscar
                </Button>
              </div>
            </div>
          )}

          {/* Botones - Derecha */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <>
                {/* Botón de Perfil del Cliente (siempre visible si está logueado) */}
                {!businessLoading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/profile")}
                    className="gap-1 text-sm"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden md:inline">Mi perfil</span>
                  </Button>
                )}

                {/* Botón Condicional: Mi negocio / Registrar negocio */}
                {!businessLoading && (
                  <Button
                    variant={hasBusinesses ? "default" : "outline"}
                    size="sm"
                    onClick={() => hasBusinesses ? navigate("/dashboard") : setShowCreateBusinessDialog(true)}
                    className="gap-1 text-sm"
                  >
                    {hasBusinesses ? (
                      <>
                        <Store className="h-4 w-4" />
                        <span className="hidden md:inline">Mi negocio</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="h-4 w-4" />
                        <span className="hidden md:inline">¿Tienes un negocio?</span>
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
                    className="gap-1 text-sm"
                  >
                    <Briefcase className="h-4 w-4" />
                    <span className="hidden md:inline">Portal</span>
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLogoutDialog(true)}
                  className="gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="text-sm"
                >
                  Iniciar sesión
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/auth?mode=signup")}
                  className="text-sm"
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
