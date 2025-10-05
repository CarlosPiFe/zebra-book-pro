import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings, Upload, X, ImagePlus, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BusinessHours } from "./BusinessHours";
import { cn } from "@/lib/utils";

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
  });

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
            <Clock className="h-5 w-5" />
            Duración de la Reserva
          </CardTitle>
          <CardDescription>
            Define la duración predeterminada para cada reserva
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  const { error } = await supabase
                    .from("businesses")
                    .update({
                      booking_slot_duration_minutes: formData.booking_slot_duration_minutes,
                    })
                    .eq("id", business.id);

                  if (error) throw error;

                  toast.success("Duración de reserva actualizada correctamente");
                  onUpdate();
                } catch (error) {
                  console.error("Error updating booking duration:", error);
                  toast.error("Error al actualizar la duración");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Guardando..." : "Aplicar Cambios"}
            </Button>
          </div>
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
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+34 XXX XXX XXX"
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
    </div>
  );
}
