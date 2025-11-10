import { useState, useEffect } from "react";
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
  Utensils,
  Plus,
  Trash2,
  Edit,
  Calendar
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BusinessHours } from "./BusinessHours";
import { PhotoGalleryManager } from "./PhotoGalleryManager";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { 
  CUISINE_TYPES_WITH_OTHER, 
  SERVICE_TYPES, 
  DISH_SPECIALTIES, 
  DIETARY_OPTIONS, 
  PRICE_RANGES 
} from "@/lib/searchFilters";
import { cn } from "@/lib/utils";

interface TimeSlot {
  id: string;
  days: number[];
  openTime: string;
  closeTime: string;
}

interface Room {
  id: string;
  name: string;
  timeSlots: TimeSlot[];
  isActive: boolean;
}

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
  price_range?: string | null;
  special_offer?: string | null;
  dietary_options?: string[] | null;
  service_types?: string[] | null;
  dish_specialties?: string[] | null;
  seo_keywords?: string | null;
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

  // Room management states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const daysOfWeek = [
    { value: 1, label: "L" },
    { value: 2, label: "M" },
    { value: 3, label: "X" },
    { value: 4, label: "J" },
    { value: 5, label: "V" },
    { value: 6, label: "S" },
    { value: 0, label: "D" },
  ];

  // Datos de filtros - importados de constantes compartidas
  const cuisineTypes = CUISINE_TYPES_WITH_OTHER;
  const serviceTypes = SERVICE_TYPES;
  const dishTypes = DISH_SPECIALTIES;
  const dietTypes = DIETARY_OPTIONS;
  const priceRanges = PRICE_RANGES;

  // Determinar si el tipo de cocina actual es personalizado
  const isCustomType = Boolean(business.cuisine_type && !cuisineTypes.slice(0, -1).includes(business.cuisine_type));
  
  const [selectedCuisineType, setSelectedCuisineType] = useState<string>(
    isCustomType ? "Otro" : (business.cuisine_type || "")
  );
  const [customCuisineType, setCustomCuisineType] = useState<string>(
    isCustomType ? business.cuisine_type || "" : ""
  );
  const [showCustomInput, setShowCustomInput] = useState<boolean>(isCustomType);
  
  // Estados para filtros de búsqueda
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>(business.price_range || "");
  const [specialOffer, setSpecialOffer] = useState<string>(business.special_offer || "");
  const [selectedDietaryOptions, setSelectedDietaryOptions] = useState<string[]>(business.dietary_options || []);
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>(business.service_types || []);
  const [selectedDishSpecialties, setSelectedDishSpecialties] = useState<string[]>(business.dish_specialties || []);
  const [seoKeywords, setSeoKeywords] = useState<string>(business.seo_keywords || "");

  // Load rooms when subsection changes
  useEffect(() => {
    if (activeSubSection === "rooms") {
      loadRooms();
    }
  }, [activeSubSection]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('business_rooms')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setRooms(data.map(room => ({
          id: room.id,
          name: room.name,
          timeSlots: (room.time_slots as unknown as TimeSlot[]) || [],
          isActive: room.is_active,
        })));
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      toast.error("Error al cargar las salas");
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleAddRoom = () => {
    const newRoom: Room = {
      id: `temp-${Date.now()}`,
      name: "",
      timeSlots: [],
      isActive: true,
    };
    setRooms([...rooms, newRoom]);
    setEditingRoomId(newRoom.id);
  };

  const handleRemoveRoom = async (id: string) => {
    if (id.startsWith('temp-')) {
      setRooms(rooms.filter(room => room.id !== id));
    } else {
      try {
        const { error } = await supabase
          .from('business_rooms')
          .delete()
          .eq('id', id);

        if (error) throw error;
        
        setRooms(rooms.filter(room => room.id !== id));
        toast.success("Sala eliminada");
      } catch (error) {
        console.error('Error deleting room:', error);
        toast.error("Error al eliminar la sala");
      }
    }
  };

  const handleRoomChange = (id: string, field: keyof Room, value: any) => {
    setRooms(rooms.map(room => 
      room.id === id ? { ...room, [field]: value } : room
    ));
  };

  const handleAddTimeSlot = (roomId: string) => {
    const newTimeSlot: TimeSlot = {
      id: `slot-${Date.now()}`,
      days: [],
      openTime: "",
      closeTime: "",
    };
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { ...room, timeSlots: [...room.timeSlots, newTimeSlot] }
        : room
    ));
  };

  const handleRemoveTimeSlot = (roomId: string, slotId: string) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? { ...room, timeSlots: room.timeSlots.filter(slot => slot.id !== slotId) }
        : room
    ));
  };

  const handleTimeSlotChange = (roomId: string, slotId: string, field: keyof TimeSlot, value: any) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? {
            ...room,
            timeSlots: room.timeSlots.map(slot =>
              slot.id === slotId ? { ...slot, [field]: value } : slot
            )
          }
        : room
    ));
  };

  const handleToggleDay = (roomId: string, slotId: string, day: number) => {
    setRooms(rooms.map(room => 
      room.id === roomId 
        ? {
            ...room,
            timeSlots: room.timeSlots.map(slot =>
              slot.id === slotId 
                ? {
                    ...slot,
                    days: slot.days.includes(day)
                      ? slot.days.filter(d => d !== day)
                      : [...slot.days, day]
                  }
                : slot
            )
          }
        : room
    ));
  };

  const handleSaveRoom = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!room.name.trim()) {
      toast.error("La sala debe tener un nombre");
      return;
    }

    setLoading(true);
    try {
      const roomData = {
        business_id: business.id,
        name: room.name,
        time_slots: room.timeSlots as any,
        is_active: room.isActive,
      };

      if (roomId.startsWith('temp-')) {
        const { data, error } = await supabase
          .from('business_rooms')
          .insert([roomData])
          .select()
          .single();

        if (error) throw error;

        setRooms(rooms.map(r => 
          r.id === roomId ? { ...room, id: data.id } : r
        ));
      } else {
        const { error } = await supabase
          .from('business_rooms')
          .update(roomData)
          .eq('id', roomId);

        if (error) throw error;
      }

      toast.success("Sala guardada correctamente");
      setEditingRoomId(null);
    } catch (error) {
      console.error('Error saving room:', error);
      toast.error("Error al guardar la sala");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRoomActive = async (roomId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('business_rooms')
        .update({ is_active: isActive })
        .eq('id', roomId);

      if (error) throw error;

      setRooms(rooms.map(room => 
        room.id === roomId ? { ...room, isActive } : room
      ));

      toast.success(isActive ? "Sala activada" : "Sala desactivada");
    } catch (error) {
      console.error('Error updating room status:', error);
      toast.error("Error al actualizar el estado de la sala");
    }
  };

  const formatRoomSchedule = (room: Room) => {
    if (room.timeSlots.length === 0) {
      return "Horario heredado del local";
    }

    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const scheduleGroups: { [key: string]: number[] } = {};

    room.timeSlots.forEach(slot => {
      const timeKey = `${slot.openTime}-${slot.closeTime}`;
      if (!scheduleGroups[timeKey]) {
        scheduleGroups[timeKey] = [];
      }
      scheduleGroups[timeKey].push(...slot.days);
    });

    const formattedGroups = Object.entries(scheduleGroups).map(([timeKey, days]) => {
      const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);
      const dayLabels = uniqueDays.map(d => dayNames[d]).join(', ');
      return `${dayLabels}: ${timeKey}`;
    });

    return formattedGroups.join(' | ');
  };

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

  const handleSubmitSearchFilters = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("businesses")
        .update({
          price_range: selectedPriceRange || null,
          special_offer: specialOffer || null,
          dietary_options: selectedDietaryOptions,
          service_types: selectedServiceTypes,
          dish_specialties: selectedDishSpecialties,
          seo_keywords: seoKeywords || null,
        })
        .eq("id", business.id);

      if (error) throw error;
      toast.success("Información de búsqueda actualizada correctamente");
      onUpdate();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al actualizar la información de búsqueda");
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (item: string, array: string[], setter: (val: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
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
          <div className="space-y-6">
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
                    <SelectContent className="bg-background z-50 max-h-[300px]">
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

            <Card>
              <CardHeader>
                <CardTitle>Información de Búsqueda</CardTitle>
                <CardDescription>
                  Configura cómo aparecerá tu restaurante en los resultados de búsqueda
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rango de Precio */}
                <div className="space-y-2">
                  <Label>Rango de Precio</Label>
                  <Select value={selectedPriceRange || "none"} onValueChange={(val) => setSelectedPriceRange(val === "none" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el rango de precio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {priceRanges.map((range) => (
                        <SelectItem key={range} value={range}>{range} - {range === "€" ? "Económico" : range === "€€" ? "Moderado" : range === "€€€" ? "Alto" : "Premium"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Oferta Especial */}
                <div className="space-y-2">
                  <Label htmlFor="special-offer">Oferta Especial</Label>
                  <Input
                    id="special-offer"
                    placeholder="Ej: 20% descuento en menú del día"
                    value={specialOffer}
                    onChange={(e) => setSpecialOffer(e.target.value)}
                  />
                </div>

                {/* Opciones Dietéticas */}
                <div className="space-y-2">
                  <Label>Opciones Dietéticas</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {dietTypes.map((diet) => (
                      <div key={diet} className="flex items-center space-x-2">
                        <Checkbox
                          id={`diet-${diet}`}
                          checked={selectedDietaryOptions.includes(diet)}
                          onCheckedChange={() => toggleArrayItem(diet, selectedDietaryOptions, setSelectedDietaryOptions)}
                        />
                        <Label htmlFor={`diet-${diet}`} className="cursor-pointer">{diet}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tipos de Servicio */}
                <div className="space-y-2">
                  <Label>Tipos de Servicio</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                    {serviceTypes.map((service) => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={selectedServiceTypes.includes(service)}
                          onCheckedChange={() => toggleArrayItem(service, selectedServiceTypes, setSelectedServiceTypes)}
                        />
                        <Label htmlFor={`service-${service}`} className="cursor-pointer text-sm">{service}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Especialidades de Platos */}
                <div className="space-y-2">
                  <Label>Especialidades de Platos</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                    {dishTypes.map((dish) => (
                      <div key={dish} className="flex items-center space-x-2">
                        <Checkbox
                          id={`dish-${dish}`}
                          checked={selectedDishSpecialties.includes(dish)}
                          onCheckedChange={() => toggleArrayItem(dish, selectedDishSpecialties, setSelectedDishSpecialties)}
                        />
                        <Label htmlFor={`dish-${dish}`} className="cursor-pointer text-sm">{dish}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEO Keywords - Campo oculto para managers */}
                <div className="border-t pt-4 space-y-2">
                  <Label htmlFor="seo-keywords">Palabras Clave SEO (Búsqueda Avanzada)</Label>
                  <p className="text-xs text-muted-foreground">
                    Añade palabras clave y descripciones que ayuden a los clientes a encontrar tu restaurante. 
                    Ejemplos: "perfecto para citas románticas", "terraza con vistas", "música en vivo los fines de semana", "ideal para celebraciones".
                    Este campo no se muestra públicamente, solo mejora los resultados de búsqueda.
                  </p>
                  <Textarea
                    id="seo-keywords"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="Ej: ambiente romántico, perfecto para cenas de negocios, terraza climatizada, vista al mar, ideal para familias con niños..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <Button onClick={handleSubmitSearchFilters} disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Información de Búsqueda"}
                </Button>
              </CardContent>
            </Card>
          </div>
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
                Gestiona las diferentes salas de tu negocio y sus horarios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingRooms ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando salas...</p>
                </div>
              ) : (
                <>
                  {rooms.length === 0 ? (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">No hay salas configuradas</p>
                      <Button onClick={handleAddRoom}>
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir Primera Sala
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {rooms.map((room) => (
                        <Card key={room.id} className={cn(
                          "border-2",
                          !room.isActive && "opacity-60"
                        )}>
                          <CardContent className="p-4 space-y-4">
                            {editingRoomId === room.id ? (
                              <>
                                {/* Editing mode */}
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <Label>Nombre de la Sala</Label>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveRoom(room.id)}
                                        disabled={loading}
                                      >
                                        {loading ? "Guardando..." : "Guardar"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingRoomId(null)}
                                      >
                                        Cancelar
                                      </Button>
                                    </div>
                                  </div>
                                  <Input
                                    value={room.name}
                                    onChange={(e) => handleRoomChange(room.id, 'name', e.target.value)}
                                    placeholder="Ej: Sala Principal, Terraza, etc."
                                  />

                                  <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                      <Label>Horarios Personalizados</Label>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAddTimeSlot(room.id)}
                                      >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Añadir Horario
                                      </Button>
                                    </div>

                                    {room.timeSlots.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        Sin horarios personalizados. La sala usará el horario general del negocio.
                                      </p>
                                    ) : (
                                      <div className="space-y-3">
                                        {room.timeSlots.map((slot) => (
                                          <Card key={slot.id} className="p-3">
                                            <div className="space-y-3">
                                              <div className="flex items-center justify-between">
                                                <Label className="text-sm">Días de la semana</Label>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => handleRemoveTimeSlot(room.id, slot.id)}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                              <div className="flex gap-1">
                                                {daysOfWeek.map((day) => (
                                                  <Button
                                                    key={day.value}
                                                    size="sm"
                                                    variant={slot.days.includes(day.value) ? "default" : "outline"}
                                                    onClick={() => handleToggleDay(room.id, slot.id, day.value)}
                                                    className="flex-1"
                                                  >
                                                    {day.label}
                                                  </Button>
                                                ))}
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <Label className="text-sm">Apertura</Label>
                                                  <Input
                                                    type="time"
                                                    value={slot.openTime}
                                                    onChange={(e) => handleTimeSlotChange(room.id, slot.id, 'openTime', e.target.value)}
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-sm">Cierre</Label>
                                                  <Input
                                                    type="time"
                                                    value={slot.closeTime}
                                                    onChange={(e) => handleTimeSlotChange(room.id, slot.id, 'closeTime', e.target.value)}
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </Card>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                {/* View mode */}
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <h3 className="font-semibold text-lg">{room.name}</h3>
                                      <Switch
                                        checked={room.isActive}
                                        onCheckedChange={(checked) => handleToggleRoomActive(room.id, checked)}
                                        disabled={room.id.startsWith('temp-')}
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        {room.isActive ? "Activa" : "Inactiva"}
                                      </span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingRoomId(room.id)}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRemoveRoom(room.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 mt-0.5" />
                                    <span>{formatRoomSchedule(room)}</span>
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Button
                        variant="outline"
                        onClick={handleAddRoom}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Añadir Nueva Sala
                      </Button>
                    </div>
                  )}
                </>
              )}
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