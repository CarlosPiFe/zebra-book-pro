import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, X, ImagePlus, Clock, CheckCircle2, CalendarCheck, DoorOpen, Trash2, Plus, Calendar, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BusinessHours } from "./BusinessHours";
import { PhotoGalleryManager } from "./PhotoGalleryManager";
import { cn } from "@/lib/utils";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";

interface TimeSlot {
  id: string;
  days: number[]; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
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
}

interface BusinessSettingsProps {
  business: Business;
  onUpdate: () => void;
}

export function BusinessSettings({ business, onUpdate }: BusinessSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Estado para la configuración de salas
  const [customRoomsEnabled, setCustomRoomsEnabled] = useState(false);
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

  // Cargar salas al montar el componente
  useEffect(() => {
    loadRooms();
  }, [business.id]);

  const loadRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data, error } = await supabase
        .from('business_rooms')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setCustomRoomsEnabled(true);
        setRooms(data.map(room => ({
          id: room.id,
          name: room.name,
          timeSlots: (room.time_slots as unknown as TimeSlot[]) || [],
          isActive: room.is_active,
        })));
      }
    } catch (error) {
      console.error('Error al cargar salas:', error);
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

  const handleRemoveRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
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

  const handleSaveRooms = async () => {
    setLoading(true);
    try {
      // Validar que todas las salas tengan nombre
      const invalidRooms = rooms.filter(room => !room.name.trim());
      if (invalidRooms.length > 0) {
        toast.error("Todas las salas deben tener un nombre");
        return;
      }

      // Obtener salas existentes
      const { data: existingRooms, error: fetchError } = await supabase
        .from('business_rooms')
        .select('id')
        .eq('business_id', business.id);

      if (fetchError) throw fetchError;

      const existingRoomIds = existingRooms?.map(r => r.id) || [];
      const currentRoomIds = rooms.filter(r => !r.id.startsWith('temp-')).map(r => r.id);

      // Eliminar salas que ya no están en la lista
      const roomsToDelete = existingRoomIds.filter(id => !currentRoomIds.includes(id));
      if (roomsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('business_rooms')
          .delete()
          .in('id', roomsToDelete);

        if (deleteError) throw deleteError;
      }

      // Insertar o actualizar salas
      for (const room of rooms) {
        const roomData = {
          business_id: business.id,
          name: room.name,
          time_slots: room.timeSlots as any,
          is_active: room.isActive,
        };

        if (room.id.startsWith('temp-')) {
          // Insertar nueva sala
          const { error: insertError } = await supabase
            .from('business_rooms')
            .insert([roomData]);

          if (insertError) throw insertError;
        } else {
          // Actualizar sala existente
          const { error: updateError } = await supabase
            .from('business_rooms')
            .update(roomData)
            .eq('id', room.id);

          if (updateError) throw updateError;
        }
      }

      toast.success("Configuración de salas guardada correctamente");
      await loadRooms();
      setEditingRoomId(null);
    } catch (error) {
      console.error('Error al guardar salas:', error);
      toast.error("Error al guardar la configuración de salas");
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
      console.error('Error al actualizar estado de la sala:', error);
      toast.error("Error al actualizar el estado de la sala");
    }
  };

  const formatRoomSchedule = (room: Room) => {
    if (room.timeSlots.length === 0) {
      return "Horario heredado del local";
    }

    const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
    const scheduleGroups: { [key: string]: number[] } = {};

    // Agrupar días por horario
    room.timeSlots.forEach(slot => {
      const timeKey = `${slot.openTime}-${slot.closeTime}`;
      if (!scheduleGroups[timeKey]) {
        scheduleGroups[timeKey] = [];
      }
      scheduleGroups[timeKey].push(...slot.days);
    });

    // Formatear cada grupo
    const formattedGroups = Object.entries(scheduleGroups).map(([timeKey, days]) => {
      const uniqueDays = Array.from(new Set(days)).sort((a, b) => a - b);
      const dayLabels = uniqueDays.map(d => dayNames[d]).join(', ');
      return `${dayLabels}: ${timeKey}`;
    });

    return formattedGroups.join(' | ');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Por favor selecciona una imagen válida (PNG, JPG, JPEG o GIF)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar los 5MB");
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Clear the manual URL input when a file is selected
    setFormData({ ...formData, image_url: "" });
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Delete old image if exists and is from storage
      if (business.image_url && business.image_url.includes('business-images')) {
        const oldPath = business.image_url.split('business-images/')[1];
        if (oldPath) {
          await supabase.storage.from('business-images').remove([oldPath]);
        }
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${business.id}-${Date.now()}.${fileExt}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from('business-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error al subir la imagen");
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalImageUrl = formData.image_url;

      // If a file is selected, upload it first
      if (selectedFile) {
        const uploadedUrl = await uploadImageToStorage(selectedFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          throw new Error("Error al subir la imagen");
        }
      }

      const { error } = await supabase
        .from("businesses")
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
          image_url: finalImageUrl,
          booking_slot_duration_minutes: formData.booking_slot_duration_minutes,
          website: formData.website,
          social_media: formData.social_media,
        })
        .eq("id", business.id);

      if (error) throw error;

      toast.success("Configuración actualizada correctamente");
      setSelectedFile(null);
      setPreviewUrl("");
      onUpdate();
    } catch (error) {
      console.error("Error updating business:", error);
      toast.error("Error al actualizar la configuración");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configuración del Negocio</h1>
        <p className="text-muted-foreground">
          Gestiona la información y configuración de tu negocio
        </p>
      </div>

      <BusinessHours businessId={business.id} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Gestión Automática de Estados
          </CardTitle>
          <CardDescription>
            Configura cómo se actualizan automáticamente los estados de las reservas cuando finaliza su tiempo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="auto-mark-in-progress" className="text-base font-medium">
                  Marcar reservas pendientes como en curso
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las reservas en estado pendiente se marcarán automáticamente como en curso cuando llegue su hora de inicio. 
                  Si desactivas esta opción, deberás marcarlas manualmente.
                </p>
              </div>
              <Switch
                id="auto-mark-in-progress"
                checked={formData.auto_mark_in_progress}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, auto_mark_in_progress: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="auto-complete-in-progress" className="text-base font-medium">
                  Marcar reservas en curso como completadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las reservas en estado "En curso" se marcarán automáticamente como "Completada" cuando pase su tiempo de finalización. 
                  Si desactivas esta opción, deberás cambiar el estado manualmente.
                </p>
              </div>
              <Switch
                id="auto-complete-in-progress"
                checked={formData.auto_complete_in_progress}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, auto_complete_in_progress: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="auto-complete-delayed" className="text-base font-medium">
                  Marcar reservas en retraso como completadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las reservas en estado "Retraso" se marcarán automáticamente como "Completada" cuando pase su tiempo de finalización.
                  Si desactivas esta opción, el estado permanecerá en "Retraso" hasta que lo cambies manualmente.
                </p>
              </div>
              <Switch
                id="auto-complete-delayed"
                checked={formData.auto_complete_delayed}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, auto_complete_delayed: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-4 border-destructive/50 bg-destructive/5">
              <div className="space-y-1 flex-1">
                <Label htmlFor="mark-delayed-as-no-show" className="text-base font-medium">
                  Marcar reservas en retraso como "No Asistido"
                </Label>
                <p className="text-sm text-muted-foreground">
                  En lugar de marcar como "Completada", las reservas en estado "Retraso" se marcarán automáticamente como "No Asistido" (color rojo) cuando finalice su tiempo.
                  Esta opción prevalece sobre la anterior si ambas están activadas.
                </p>
              </div>
              <Switch
                id="mark-delayed-as-no-show"
                checked={formData.mark_delayed_as_no_show}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, mark_delayed_as_no_show: checked })
                }
              />
            </div>
          </div>

          <Button
            type="button"
            onClick={async () => {
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

                toast.success("Configuración de estados actualizada correctamente");
                onUpdate();
              } catch (error) {
                console.error("Error updating automation settings:", error);
                toast.error("Error al actualizar la configuración");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar Configuración de Estados"}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Visualización de Horarios
          </CardTitle>
          <CardDescription>
            Configura cómo se muestra el calendario de horarios de empleados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="schedule_view_mode">Tipo de visualización de horarios</Label>
            <Select
              value={formData.schedule_view_mode}
              onValueChange={(value) => setFormData({ ...formData, schedule_view_mode: value })}
            >
              <SelectTrigger id="schedule_view_mode">
                <SelectValue placeholder="Selecciona modo de visualización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editable">Editable (por defecto)</SelectItem>
                <SelectItem value="visual">Solo visual (bloqueado hasta editar)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {formData.schedule_view_mode === 'editable' 
                ? 'El calendario de horarios se mostrará siempre editable, permitiendo modificar los turnos directamente.'
                : 'El calendario se mostrará bloqueado. Para editarlo, deberás pulsar el botón "Editar horario".'}
            </p>
          </div>

          <Button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await supabase
                  .from("businesses")
                  .update({
                    schedule_view_mode: formData.schedule_view_mode,
                  })
                  .eq("id", business.id);

                if (error) throw error;

                toast.success("Configuración de visualización de horarios actualizada correctamente");
                onUpdate();
              } catch (error) {
                console.error("Error updating schedule view mode:", error);
                toast.error("Error al actualizar la configuración");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar Configuración de Visualización"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            Configuración de Salas
          </CardTitle>
          <CardDescription>
            Gestiona los diferentes espacios o salas de tu local
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1 flex-1">
              <Label htmlFor="custom-rooms-toggle" className="text-base font-medium">
                Activar salas personalizadas
              </Label>
              <p className="text-sm text-muted-foreground">
                Permite configurar diferentes espacios en tu local (Comedor, Terraza, Sala Privada, etc.)
              </p>
            </div>
            <Switch
              id="custom-rooms-toggle"
              checked={customRoomsEnabled}
              onCheckedChange={async (checked) => {
                if (!checked && rooms.length > 0) {
                  // Si se desactiva y hay salas, preguntar confirmación
                  if (!confirm('¿Estás seguro? Esto eliminará todas las salas configuradas.')) {
                    return;
                  }
                  // Eliminar todas las salas de la base de datos
                  try {
                    const { error } = await supabase
                      .from('business_rooms')
                      .delete()
                      .eq('business_id', business.id);

                    if (error) throw error;

                    setRooms([]);
                    toast.success('Salas eliminadas correctamente');
                  } catch (error) {
                    console.error('Error al eliminar salas:', error);
                    toast.error('Error al eliminar las salas');
                    return;
                  }
                }
                setCustomRoomsEnabled(checked);
              }}
            />
          </div>

          {customRoomsEnabled && (
            <div className="space-y-4 animate-in fade-in-50 duration-300">
              {loadingRooms ? (
                <div className="text-center py-4 text-muted-foreground">
                  Cargando salas...
                </div>
              ) : rooms.length > 0 && (
                <div className="space-y-3">
                  {rooms.map((room) => {
                    const isEditing = editingRoomId === room.id || room.id.startsWith('temp-');
                    
                    if (!isEditing) {
                      // Vista compacta
                      return (
                        <div
                          key={room.id}
                          className="flex items-center justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-1">{room.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatRoomSchedule(room)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={room.isActive}
                              onCheckedChange={(checked) => handleToggleRoomActive(room.id, checked)}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRoomId(room.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    }

                    // Vista de edición
                    return (
                      <Card key={room.id} className="border-2 hover:border-primary/50 transition-colors">
                        <CardContent className="pt-6 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`room-name-${room.id}`}>Nombre de la sala</Label>
                            <Input
                              id={`room-name-${room.id}`}
                              value={room.name}
                              onChange={(e) => handleRoomChange(room.id, 'name', e.target.value)}
                              placeholder="Ej: Terraza, Comedor, Sala Privada..."
                            />
                          </div>

                          {/* Tramos de horarios */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-base">Horarios</Label>
                              <Button
                                type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddTimeSlot(room.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Añadir tramo
                            </Button>
                          </div>

                          {room.timeSlots.length === 0 ? (
                            <div className="p-4 border rounded-lg bg-accent/10 border-accent/30">
                              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4 text-foreground" />
                                Horario heredado del local
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Esta sala seguirá el horario de apertura general del negocio. 
                                Si deseas establecer horarios específicos para esta sala, añade un tramo horario.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                Horarios específicos de la sala. Los días y horarios no incluidos estarán cerrados.
                              </p>
                              <div className="space-y-3">
                              {room.timeSlots.map((slot) => (
                                <div key={slot.id} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm font-medium flex items-center gap-2">
                                      <Calendar className="h-4 w-4" />
                                      Días de la semana
                                    </Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveTimeSlot(room.id, slot.id)}
                                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>

                                  <div className="flex gap-2">
                                    {daysOfWeek.map((day) => (
                                      <Button
                                        key={day.value}
                                        type="button"
                                        variant={slot.days.includes(day.value) ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleToggleDay(room.id, slot.id, day.value)}
                                        className="h-9 w-9 p-0"
                                      >
                                        {day.label}
                                      </Button>
                                    ))}
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label htmlFor={`slot-open-${slot.id}`} className="text-sm">
                                        Hora de apertura
                                      </Label>
                                      <Input
                                        id={`slot-open-${slot.id}`}
                                        type="time"
                                        value={slot.openTime}
                                        onChange={(e) => handleTimeSlotChange(room.id, slot.id, 'openTime', e.target.value)}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor={`slot-close-${slot.id}`} className="text-sm">
                                        Hora de cierre
                                      </Label>
                                      <Input
                                        id={`slot-close-${slot.id}`}
                                        type="time"
                                        value={slot.closeTime}
                                        onChange={(e) => handleTimeSlotChange(room.id, slot.id, 'closeTime', e.target.value)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center gap-3">
                            <Switch
                              id={`room-active-${room.id}`}
                              checked={room.isActive}
                              onCheckedChange={(checked) => handleRoomChange(room.id, 'isActive', checked)}
                            />
                            <Label htmlFor={`room-active-${room.id}`} className="cursor-pointer">
                              {room.isActive ? (
                                <span className="text-green-600 font-medium">Sala activa</span>
                              ) : (
                                <span className="text-muted-foreground font-medium">Sala cerrada</span>
                              )}
                            </Label>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveRoom(room.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddRoom}
                className="w-full border-dashed border-2 hover:border-primary hover:bg-primary/5 hover:text-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Añadir sala
              </Button>

              {rooms.length > 0 && (
                <Button
                  type="button"
                  onClick={handleSaveRooms}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Guardando..." : "Guardar configuración de salas"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Reservas
          </CardTitle>
          <CardDescription>
            Configura los ajustes de las reservas de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>Duración de la Reserva</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="booking_hours" className="text-sm text-muted-foreground">Horas</Label>
                <Select
                  value={Math.floor(formData.booking_slot_duration_minutes / 60).toString()}
                  onValueChange={(value) => {
                    const hours = parseInt(value);
                    const currentMinutes = formData.booking_slot_duration_minutes % 60;
                    setFormData({ ...formData, booking_slot_duration_minutes: hours * 60 + currentMinutes });
                  }}
                >
                  <SelectTrigger id="booking_hours">
                    <SelectValue placeholder="Horas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 horas</SelectItem>
                    <SelectItem value="1">1 hora</SelectItem>
                    <SelectItem value="2">2 horas</SelectItem>
                    <SelectItem value="3">3 horas</SelectItem>
                    <SelectItem value="4">4 horas</SelectItem>
                    <SelectItem value="5">5 horas</SelectItem>
                    <SelectItem value="6">6 horas</SelectItem>
                    <SelectItem value="7">7 horas</SelectItem>
                    <SelectItem value="8">8 horas</SelectItem>
                    <SelectItem value="9">9 horas</SelectItem>
                    <SelectItem value="10">10 horas</SelectItem>
                    <SelectItem value="11">11 horas</SelectItem>
                    <SelectItem value="12">12 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="booking_minutes" className="text-sm text-muted-foreground">Minutos</Label>
                <Select
                  value={(formData.booking_slot_duration_minutes % 60).toString()}
                  onValueChange={(value) => {
                    const currentHours = Math.floor(formData.booking_slot_duration_minutes / 60);
                    const minutes = parseInt(value);
                    setFormData({ ...formData, booking_slot_duration_minutes: currentHours * 60 + minutes });
                  }}
                >
                  <SelectTrigger id="booking_minutes">
                    <SelectValue placeholder="Minutos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">00 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Esta duración se aplicará automáticamente a todas las reservas nuevas. 
              Las reservas manuales pueden personalizar la hora de finalización si es necesario.
            </p>
          </div>

          <div className="space-y-4 border-t pt-6">
            <div className="space-y-2">
              <Label htmlFor="booking_additional_message">Mensaje Adicional</Label>
              <Textarea
                id="booking_additional_message"
                value={formData.booking_additional_message}
                onChange={(e) => setFormData({ ...formData, booking_additional_message: e.target.value })}
                placeholder="Ej: Por favor llega 10 minutos antes de tu cita"
                rows={3}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                Este mensaje se mostrará a los clientes cuando realicen una reserva en tu negocio.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await supabase
                  .from("businesses")
                  .update({
                    booking_slot_duration_minutes: formData.booking_slot_duration_minutes,
                    booking_additional_message: formData.booking_additional_message,
                  })
                  .eq("id", business.id);

                if (error) throw error;

                toast.success("Configuración de reservas actualizada correctamente");
                onUpdate();
              } catch (error) {
                console.error("Error updating booking settings:", error);
                toast.error("Error al actualizar la configuración");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar Configuración de Reservas"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Confirmación de reservas
          </CardTitle>
          <CardDescription>
            Elige si las reservas realizadas por los clientes se confirman automáticamente o si requieren tu aprobación manual antes de ser efectivas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={bookingConfirmationType}
            onValueChange={setBookingConfirmationType}
            className="space-y-4"
          >
            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="automatic" id="automatic" className="mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="automatic" className="text-base font-medium cursor-pointer">
                  Confirmación automática
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las reservas se confirman inmediatamente cuando el cliente las realiza. El cliente recibe confirmación instantánea.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="manual" id="manual" className="mt-0.5" />
              <div className="space-y-1 flex-1">
                <Label htmlFor="manual" className="text-base font-medium cursor-pointer">
                  Confirmación manual (requiere aprobación)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Las reservas quedan pendientes hasta que las apruebes manualmente desde tu panel. Ideal para negocios que necesitan validar disponibilidad.
                </p>
              </div>
            </div>
          </RadioGroup>

          <Button
            type="button"
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await supabase
                  .from("businesses")
                  .update({
                    booking_mode: bookingConfirmationType,
                  })
                  .eq("id", business.id);

                if (error) throw error;

                toast.success("Tipo de confirmación de reservas actualizado correctamente");
                onUpdate();
              } catch (error) {
                console.error("Error updating booking confirmation type:", error);
                toast.error("Error al actualizar el tipo de confirmación");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar Tipo de Confirmación"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Información del Negocio
          </CardTitle>
          <CardDescription>
            Actualiza los datos de tu negocio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Negocio</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nombre de tu negocio"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Calle, número, ciudad"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <PhoneInput
                  defaultCountry="es"
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                  placeholder="+34 XXX XXX XXX"
                  className="phone-input-custom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contacto@negocio.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de tu negocio"
                rows={4}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Imagen del Negocio</Label>
                <p className="text-sm text-muted-foreground">
                  Puedes elegir entre subir un archivo o proporcionar una URL
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload Option - Visual Box */}
                <div className="space-y-2">
                  <Label>Subir Archivo</Label>
                  <input
                    ref={fileInputRef}
                    id="image_file"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={!!formData.image_url}
                  />
                  <button
                    type="button"
                    onClick={() => !formData.image_url && fileInputRef.current?.click()}
                    disabled={!!formData.image_url}
                    className={cn(
                      "relative w-full h-40 rounded-lg border-2 border-dashed transition-all",
                      "flex flex-col items-center justify-center gap-2 p-4",
                      "hover:border-primary hover:bg-primary/5",
                      formData.image_url ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      selectedFile && "border-primary bg-primary/10"
                    )}
                  >
                    {selectedFile ? (
                      <>
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-full object-contain rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile();
                            }}
                            className="absolute top-1 right-1 h-7 w-7"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                        <div className="text-center">
                          <p className="font-medium text-sm">Subir imagen</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG, JPG, GIF (máx. 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </button>
                </div>

                {/* URL Option */}
                <div className="space-y-2">
                  <Label htmlFor="image_url">O introduce una URL</Label>
                  <div className="space-y-3">
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => {
                        setFormData({ ...formData, image_url: e.target.value });
                        if (e.target.value && selectedFile) {
                          handleRemoveFile();
                        }
                      }}
                      placeholder="https://ejemplo.com/imagen.jpg"
                      disabled={!!selectedFile}
                      className="w-full"
                    />
                    {formData.image_url && !selectedFile && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                        <img
                          src={formData.image_url}
                          alt="Vista previa URL"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800';
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => setFormData({ ...formData, image_url: "" })}
                          className="absolute top-1 right-1 h-7 w-7"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Sitio Web</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://tunegocio.com"
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label>Redes Sociales</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Añade los enlaces a tus perfiles en redes sociales
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    type="url"
                    value={formData.social_media.facebook}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      social_media: { ...formData.social_media, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/tunegocio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    type="url"
                    value={formData.social_media.instagram}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      social_media: { ...formData.social_media, instagram: e.target.value }
                    })}
                    placeholder="https://instagram.com/tunegocio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <Input
                    id="twitter"
                    type="url"
                    value={formData.social_media.twitter}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      social_media: { ...formData.social_media, twitter: e.target.value }
                    })}
                    placeholder="https://twitter.com/tunegocio"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={formData.social_media.linkedin}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      social_media: { ...formData.social_media, linkedin: e.target.value }
                    })}
                    placeholder="https://linkedin.com/company/tunegocio"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full bg-accent hover:bg-accent/90"
            >
              {loading || uploadingImage ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <PhotoGalleryManager businessId={business.id} />
    </div>
  );
}
