import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Store, User, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const authSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  confirmPassword: z.string().optional(),
  fullName: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }).optional(),
}).refine((data) => {
  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [isBusiness, setIsBusiness] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"client" | "owner">("client");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validationData = isSignUp 
        ? { email, password, confirmPassword, fullName }
        : { email, password };
      
      authSchema.parse(validationData);

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: role,
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email ya está registrado. Intenta iniciar sesión.");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("¡Cuenta creada! Redirigiendo...");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email o contraseña incorrectos");
          } else {
            toast.error(error.message);
          }
          return;
        }

        toast.success("¡Bienvenido de vuelta!");
        navigate("/dashboard");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Ocurrió un error. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-strong relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="absolute top-4 left-4 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        
        <CardHeader className="text-center pt-12">
          <div className="flex justify-center mb-4">
            <Calendar className="h-12 w-12 text-accent" />
          </div>
          <CardTitle className="text-2xl">
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? "Regístrate para comenzar a gestionar reservas"
              : "Accede a tu cuenta de ZebraTime"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-3">
                  <Label className="text-base font-semibold">¿Qué tipo de cuenta necesitas?</Label>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("client")}
                      className={cn(
                        "relative flex items-start p-4 rounded-lg border-2 transition-all text-left",
                        role === "client"
                          ? "border-accent bg-accent/5 shadow-md"
                          : "border-border hover:border-accent/50 bg-background"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full",
                          role === "client" ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-base mb-1">Soy Cliente</p>
                          <p className="text-sm text-muted-foreground">
                            Quiero reservar en restaurantes, peluquerías, gimnasios, etc.
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("owner")}
                      className={cn(
                        "relative flex items-start p-4 rounded-lg border-2 transition-all text-left",
                        role === "owner"
                          ? "border-accent bg-accent/5 shadow-md"
                          : "border-border hover:border-accent/50 bg-background"
                      )}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full",
                          role === "owner" ? "bg-accent text-white" : "bg-muted text-muted-foreground"
                        )}>
                          <Store className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-base mb-1">Tengo un Negocio</p>
                          <p className="text-sm text-muted-foreground">
                            Quiero gestionar las reservas de mi negocio
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {!isSignUp && isBusiness ? (
              <div className="space-y-2">
                <Label htmlFor="businessId">Identificación del negocio</Label>
                <Input
                  id="businessId"
                  type="text"
                  placeholder="ID proporcionado por administrador"
                  value={businessId}
                  onChange={(e) => setBusinessId(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <PasswordInput
                  id="confirmPassword"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90"
              disabled={loading}
            >
              {loading ? "Procesando..." : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
            </Button>

            <div className="text-center text-sm space-y-2">
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => setIsBusiness(!isBusiness)}
                  className="text-accent hover:underline font-medium block w-full"
                >
                  {isBusiness ? "¿Eres cliente?" : "¿Eres negocio?"}
                </button>
              )}
              
              {isSignUp ? (
                <p className="text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-accent hover:underline font-medium"
                  >
                    Inicia sesión
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-accent hover:underline font-medium"
                  >
                    Regístrate
                  </button>
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
