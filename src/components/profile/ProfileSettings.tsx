import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface ProfileSettingsProps {
  userId: string;
  profile: any;
  onUpdate: () => void;
}

export const ProfileSettings = ({ userId, profile, onUpdate }: ProfileSettingsProps) => {
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [saving, setSaving] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);

  // Verificar si el usuario es empleado
  useEffect(() => {
    const checkIfEmployee = async () => {
      if (!profile?.email) return;
      
      const { data } = await supabase
        .from("waiters")
        .select("id")
        .eq("email", profile.email)
        .eq("is_active", true)
        .limit(1);
      
      setIsEmployee(data && data.length > 0);
    };
    
    checkIfEmployee();
  }, [profile?.email]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Perfil actualizado correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Error al actualizar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información personal</CardTitle>
        <CardDescription>
          Actualiza tu información personal y preferencias
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor="fullName">Nombre *</Label>
            {isEmployee && (
              <span className="text-xs text-muted-foreground">
                (Este nombre solo se usa para tus reservas personales y no afecta a tu perfil de empleado)
              </span>
            )}
          </div>
          <Input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor="phone">Teléfono</Label>
            <span className="text-xs text-muted-foreground">
              (Se usará para autocompletar tus reservas, pero siempre podrás cambiarlo)
            </span>
          </div>
          <PhoneInput
            defaultCountry="es"
            value={phone}
            onChange={(phone) => setPhone(phone)}
            className="phone-input-custom px-0 text-base mx-0"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            type="email"
            value={profile?.email || ""}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            El correo electrónico no se puede modificar
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
