import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "react-international-phone";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Clock, Users, Mail, Lock, User, Phone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BookingAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  bookingDate: Date;
  startTime: string;
  partySize: string;
  onAuthSuccess: (user: any, profile: any) => void;
}

type AuthStep = 'email' | 'password' | 'register' | 'profile';

export function BookingAuthDialog({
  open,
  onOpenChange,
  businessName,
  bookingDate,
  startTime,
  partySize,
  onAuthSuccess
}: BookingAuthDialogProps) {
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckEmail = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Por favor ingresa un correo válido');
      return;
    }

    setLoading(true);
    try {
      // Intentar iniciar sesión con una contraseña falsa para ver si el usuario existe
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'check_if_exists_12345',
      });

      // Si el error es de credenciales inválidas, el usuario existe
      if (error?.message.includes('Invalid login credentials')) {
        setAuthStep('password');
      } else if (error) {
        // Si es otro error (usuario no encontrado), es un nuevo usuario
        setAuthStep('register');
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setAuthStep('register');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Obtener perfil del usuario
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      toast.success('¡Sesión iniciada!');
      onAuthSuccess(data.user, profile);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast.error(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!password || password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      if (data.user) {
        setAuthStep('profile');
      }
    } catch (error: any) {
      console.error('Error registering:', error);
      toast.error(error.message || 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!fullName || !phone) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No user found');

      // Actualizar o crear perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('¡Perfil completado!');
      onAuthSuccess(user, profile);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error completing profile:', error);
      toast.error(error.message || 'Error al guardar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirma tu reserva</DialogTitle>
        </DialogHeader>

        {/* Resumen de la reserva */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{format(bookingDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{startTime}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{partySize} {parseInt(partySize) === 1 ? 'persona' : 'personas'}</span>
          </div>
          <div className="text-sm font-semibold mt-2 pt-2 border-t border-border">
            {businessName}
          </div>
        </div>

        {/* Step: Email */}
        {authStep === 'email' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckEmail()}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <Button onClick={handleCheckEmail} disabled={loading} className="w-full">
              {loading ? 'Verificando...' : 'Continuar'}
            </Button>
          </div>
        )}

        {/* Step: Login */}
        {authStep === 'password' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Ya tienes cuenta con <span className="font-medium text-foreground">{email}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAuthStep('email')} className="flex-1">
                Volver
              </Button>
              <Button onClick={handleLogin} disabled={loading} className="flex-1">
                {loading ? 'Iniciando...' : 'Iniciar sesión'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Register */}
        {authStep === 'register' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Crea una cuenta con <span className="font-medium text-foreground">{email}</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Crea una contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAuthStep('email')} className="flex-1">
                Volver
              </Button>
              <Button onClick={handleRegister} disabled={loading} className="flex-1">
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Profile */}
        {authStep === 'profile' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              ¡Último paso! Completa tus datos
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                <PhoneInput
                  defaultCountry="es"
                  value={phone}
                  onChange={(phone) => setPhone(phone)}
                  inputClassName="pl-9"
                />
              </div>
            </div>
            <Button onClick={handleCompleteProfile} disabled={loading} className="w-full">
              {loading ? 'Guardando...' : 'Completar reserva'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
