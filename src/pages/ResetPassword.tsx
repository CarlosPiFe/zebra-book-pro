import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

const resetPasswordSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si hay una sesión activa (usuario llegó desde el email)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      } else {
        setValidToken(false);
      }
    });

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidToken(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    try {
      const result = resetPasswordSchema.safeParse({ password, confirmPassword });

      if (!result.success) {
        const firstError = result.error.errors[0];
        toast({
          variant: "destructive",
          title: "Error de validación",
          description: firstError?.message || "Error de validación",
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: "¡Contraseña actualizada!",
        description: "Tu contraseña ha sido cambiada con éxito.",
      });

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo actualizar la contraseña. Por favor, intenta de nuevo.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Verificando enlace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-destructive">
              Enlace inválido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              Este enlace ya no es válido o ha expirado. Por favor, solicita uno nuevo.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              Volver al inicio de sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Restablecer contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nueva contraseña</Label>
              <PasswordInput
                id="password"
                name="password"
                placeholder="Introduce tu nueva contraseña"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirma tu nueva contraseña"
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Procesando..." : "Actualizar contraseña"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate("/auth")}
                disabled={loading}
                className="text-primary text-sm"
              >
                Volver al inicio de sesión
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
