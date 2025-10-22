import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, LogOut, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AccountSecurityProps {
  userEmail: string;
}

export const AccountSecurity = ({ userEmail }: AccountSecurityProps) => {
  const navigate = useNavigate();

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast.success("Te hemos enviado un correo para restablecer tu contraseña");
    } catch (error) {
      console.error("Error sending password reset:", error);
      toast.error("Error al enviar el correo de restablecimiento");
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Sesión cerrada correctamente");
      navigate("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error al cerrar sesión");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Seguridad de la cuenta
          </CardTitle>
          <CardDescription>
            Gestiona la seguridad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Correo electrónico</h3>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Contraseña</h3>
            <Button 
              variant="outline" 
              onClick={handlePasswordReset}
              className="w-full gap-2"
            >
              <Key className="h-4 w-4" />
              Cambiar contraseña
            </Button>
            <p className="text-xs text-muted-foreground">
              Se enviará un correo con instrucciones para cambiar tu contraseña
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full gap-2"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          Tu cuenta está vinculada a tu correo electrónico. Si deseas eliminar tu cuenta, contacta con soporte.
        </AlertDescription>
      </Alert>
    </div>
  );
};
