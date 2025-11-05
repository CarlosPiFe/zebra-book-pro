import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CheckCircle2, 
  DoorOpen, 
  Timer, 
  MessageSquare, 
  CalendarCheck,
  Info,
  Globe,
  Utensils
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessHours } from "./BusinessHours";
import { PhotoGalleryManager } from "./PhotoGalleryManager";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  image_url: string;
  booking_slot_duration_minutes: number;
  website: string | null;
  social_media: any;
  auto_mark_in_progress?: boolean;
  auto_complete_in_progress?: boolean;
  auto_complete_delayed?: boolean;
  mark_delayed_as_no_show?: boolean;
  booking_additional_message?: string | null;
  schedule_view_mode?: string;
  booking_mode?: string;
  cuisine_type?: string | null;
}

interface SettingsContentProps {
  business: Business;
  activeSubSection: string;
  onUpdate: () => void;
}

export function SettingsContent({ business, activeSubSection, onUpdate }: SettingsContentProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: business.name,
    address: business.address || "",
    phone: business.phone || "",
    email: business.email || "",
    description: business.description || "",
    image_url: business.image_url || "",
    booking_slot_duration_minutes: business.booking_slot_duration_minutes || 60,
    website: business.website || "",
    social_media: {
      facebook: business.social_media?.facebook || "",
      instagram: business.social_media?.instagram || "",
      twitter: business.social_media?.twitter || "",
      linkedin: business.social_media?.linkedin || "",
    },
    auto_mark_in_progress: business.auto_mark_in_progress ?? true,
    auto_complete_in_progress: business.auto_complete_in_progress ?? true,
    auto_complete_delayed: business.auto_complete_delayed ?? true,
    mark_delayed_as_no_show: business.mark_delayed_as_no_show ?? false,
    booking_additional_message: business.booking_additional_message || "",
    schedule_view_mode: business.schedule_view_mode || "editable",
  });
  
  const [bookingConfirmationType, setBookingConfirmationType] = useState<string>(
    business.booking_mode || "automatic"
  );

  const cuisineTypes = [
    "Chino",
    "Japonés",
    "Español",
    "Italiano",
    "Mexicano",
    "Indio",
    "Mediterráneo",
    "Otro"
  ];

  // Determinar si el tipo de cocina actual es personalizado
  const isCustomType = Boolean(business.cuisine_type && !cuisineTypes.slice(0, -1).includes(business.cuisine_type));
  
  const [selectedCuisineType, setSelectedCuisineType] = useState<string>(
    isCustomType ? "Otro" : (business.cuisine_type || "")
  );
  const [customCuisineType, setCustomCuisineType] = useState<string>(
    isCustomType ? business.cuisine_type || "" : ""
  );
  const [showCustomInput, setShowCustomInput] = useState<boolean>(isCustomType);

  const handleCuisineTypeChange = (value: string) => {
    setSelectedCuisineType(value);
    if (value === "Otro") {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomCuisineType("");
    }
  };

  const handleSubmitBasicInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
        })
        .eq("id", business.id);

      if (error) throw error;

      toast.success("Información actualizada correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error updating business:", error);
      toast.error("Error al actualizar la información");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAutoStates = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          auto_mark_in_progress: formData.auto_mark_in_progress,
          auto_complete_in_progress: formData.auto_complete_in_progress,
          auto_complete_delayed: formData.auto_complete_delayed,
          mark_delayed_as_no_show: formData.mark_delayed_as_no_show,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Configuración actualizada correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBookingDuration = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          booking_slot_duration_minutes: formData.booking_slot_duration_minutes,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Duración de reservas actualizada");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBookingMessage = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          booking_additional_message: formData.booking_additional_message,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Mensaje actualizado correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar el mensaje");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBookingConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          booking_mode: bookingConfirmationType,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Configuración de confirmación actualizada");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWebsiteSocial = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          website: formData.website,
          social_media: formData.social_media,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Enlaces actualizados correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCuisineType = async () => {
    setLoading(true);
    try {
      const finalCuisineType = showCustomInput ? customCuisineType : selectedCuisineType;
      
      if (showCustomInput && !customCuisineType.trim()) {
        toast.error("Por favor, especifica el tipo de restaurante");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("businesses")
        .update({
          cuisine_type: finalCuisineType,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Tipo de restaurante actualizado correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar el tipo de restaurante");
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (activeSubSection) {
      case "business-info":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Información del Negocio
              </CardTitle>
              <CardDescription>
                Actualiza la información básica de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitBasicInfo} className="space-y-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Negocio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {/* Dirección */}
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <PhoneInput
                    defaultCountry="es"
                    value={formData.phone}
                    onChange={(phone) => setFormData({ ...formData, phone })}
                    className="w-full"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        );

      case "restaurant-type":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                Tipo de Restaurante
              </CardTitle>
              <CardDescription>
                Selecciona el tipo de cocina que ofrece tu restaurante
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cuisine-type">Tipo de cocina</Label>
                <Select
                  value={selectedCuisineType}
                  onValueChange={handleCuisineTypeChange}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecciona un tipo de cocina" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {cuisineTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showCustomInput && (
                <div className="space-y-2">
                  <Label htmlFor="custom-cuisine">Especifica el tipo de cocina</Label>
                  <Input
                    id="custom-cuisine"
                    placeholder="Ej: Fusión asiática, Vegano, etc."
                    value={customCuisineType}
                    onChange={(e) => setCustomCuisineType(e.target.value)}
                  />
                </div>
              )}

              <Button onClick={handleSubmitCuisineType} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Tipo de Cocina"}
              </Button>
            </CardContent>
          </Card>
        );

      case "business-hours":
        return <BusinessHours businessId={business.id} />;

      case "auto-states":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Gestión Automática de Estados
              </CardTitle>
              <CardDescription>
                Configura cómo se actualizan automáticamente los estados de las reservas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-medium">
                      Marcar reservas pendientes como en curso
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Las reservas en estado pendiente se marcarán automáticamente como en curso cuando llegue su hora de inicio.
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_mark_in_progress}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, auto_mark_in_progress: checked })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-medium">
                      Completar automáticamente reservas en curso
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Las reservas en curso se marcarán como completadas cuando finalice su tiempo.
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_complete_in_progress}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, auto_complete_in_progress: checked })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-medium">
                      Completar automáticamente reservas retrasadas
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Las reservas retrasadas se marcarán como completadas cuando finalice su tiempo.
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_complete_delayed}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, auto_complete_delayed: checked })
                    }
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1 flex-1">
                    <Label className="text-base font-medium">
                      Marcar reservas retrasadas como no asistidas
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Si está activado, las reservas retrasadas se marcarán como "no asistió" en lugar de completadas.
                    </p>
                  </div>
                  <Switch
                    checked={formData.mark_delayed_as_no_show}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, mark_delayed_as_no_show: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSubmitAutoStates} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </CardContent>
          </Card>
        );

      case "rooms":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />
                Configuración de Salas
              </CardTitle>
              <CardDescription>
                Esta funcionalidad está en desarrollo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Próximamente podrás gestionar diferentes salas para tu negocio.
              </p>
            </CardContent>
          </Card>
        );

      case "booking-duration":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Duración de Reservas
              </CardTitle>
              <CardDescription>
                Define cuánto tiempo dura cada reserva por defecto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración en minutos</Label>
                <Select
                  value={formData.booking_slot_duration_minutes.toString()}
                  onValueChange={(value) =>
                    setFormData({ ...formData, booking_slot_duration_minutes: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1 hora 30 minutos</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                    <SelectItem value="150">2 horas 30 minutos</SelectItem>
                    <SelectItem value="180">3 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSubmitBookingDuration} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Duración"}
              </Button>
            </CardContent>
          </Card>
        );

      case "booking-message":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Mensaje Adicional en Reservas
              </CardTitle>
              <CardDescription>
                Añade un mensaje personalizado que se mostrará al realizar reservas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking-message">Mensaje</Label>
                <Textarea
                  id="booking-message"
                  value={formData.booking_additional_message}
                  onChange={(e) =>
                    setFormData({ ...formData, booking_additional_message: e.target.value })
                  }
                  placeholder="Ejemplo: Recuerda llegar 10 minutos antes de tu reserva"
                  rows={4}
                />
              </div>

              <Button onClick={handleSubmitBookingMessage} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Mensaje"}
              </Button>
            </CardContent>
          </Card>
        );

      case "booking-confirmation":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5" />
                Tipo de Confirmación de Reservas
              </CardTitle>
              <CardDescription>
                Elige cómo se confirman las reservas de tu negocio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={bookingConfirmationType}
                onValueChange={setBookingConfirmationType}
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <div className="space-y-1">
                    <Label htmlFor="automatic" className="font-medium cursor-pointer">
                      Confirmación Automática
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Las reservas se confirman automáticamente al momento de crearlas
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
                  <RadioGroupItem value="manual" id="manual" />
                  <div className="space-y-1">
                    <Label htmlFor="manual" className="font-medium cursor-pointer">
                      Confirmación Manual
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Debes confirmar manualmente cada reserva antes de que esté activa
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <Button onClick={handleSubmitBookingConfirmation} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </CardContent>
          </Card>
        );

      case "photo-gallery":
        return <PhotoGalleryManager businessId={business.id} />;

      case "website-social":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sitio Web y Redes Sociales
              </CardTitle>
              <CardDescription>
                Añade los enlaces a tu sitio web y redes sociales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://tuempresa.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  type="url"
                  placeholder="https://facebook.com/tupagina"
                  value={formData.social_media.facebook}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, facebook: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  type="url"
                  placeholder="https://instagram.com/tuperfil"
                  value={formData.social_media.instagram}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, instagram: e.target.value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter">Twitter / X</Label>
                <Input
                  id="twitter"
                  type="url"
                  placeholder="https://twitter.com/tuperfil"
                  value={formData.social_media.twitter}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      social_media: { ...formData.social_media, twitter: e.target.value },
                    })
                  }
                />
              </div>

              <Button onClick={handleSubmitWebsiteSocial} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Enlaces"}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Selecciona una opción del menú
              </p>
            </CardContent>
          </Card>
        );
    }
  };

  return <div className="space-y-6">{renderContent()}</div>;
}