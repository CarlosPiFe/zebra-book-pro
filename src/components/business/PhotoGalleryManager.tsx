import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImagePlus, X, ArrowUpDown } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { compressImage, formatFileSize } from "@/lib/imageCompression";

interface Photo {
  id: string;
  photo_url: string;
  display_order: number;
  is_main: boolean;
}

interface PhotoGalleryManagerProps {
  businessId: string;
}

export function PhotoGalleryManager({ businessId }: PhotoGalleryManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orderingMode, setOrderingMode] = useState(false);
  const [selectedForOrder, setSelectedForOrder] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [businessId]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("business_photos")
        .select("*")
        .eq("business_id", businessId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error("Error cargando fotos:", error);
      toast.error("Error al cargar las fotos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = [
      "image/png", 
      "image/jpeg", 
      "image/jpg", 
      "image/webp",
      "image/gif",
      "image/bmp",
      "image/svg+xml"
    ];
    const maxSizeBeforeCompression = 20 * 1024 * 1024; // 20MB antes de comprimir

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (!file) continue;

        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name}: Formato no válido. Use: JPG, PNG, WEBP, GIF, BMP o SVG`);
          continue;
        }

        if (file.size > maxSizeBeforeCompression) {
          toast.error(`${file.name}: Tamaño máximo 20MB`);
          continue;
        }

        // Comprimir imagen automáticamente a máximo 250KB (excepto SVG)
        if (file.type !== "image/svg+xml") {
          try {
            const originalSize = file.size;
            const compressedFile = await compressImage(file, 250); // 250KB máximo
            const compressionRatio = Math.round((1 - compressedFile.size / originalSize) * 100);
            
            console.log(
              `✓ ${file.name}: ${formatFileSize(originalSize)} → ${formatFileSize(compressedFile.size)} (${compressionRatio}% reducción)`
            );
            
            file = compressedFile;
          } catch (compressionError) {
            console.error("Error comprimiendo imagen:", compressionError);
            toast.error(`${file.name}: No se pudo comprimir la imagen`);
            continue;
          }
        }

        // Upload to storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${businessId}/${Date.now()}-${i}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('business-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('business-images')
          .getPublicUrl(data.path);

        uploadedUrls.push(publicUrl);
      }

      // Insert photos into database
      const maxOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) : 0;
      const newPhotos = uploadedUrls.map((url, index) => ({
        business_id: businessId,
        photo_url: url,
        display_order: maxOrder + index + 1,
        is_main: photos.length === 0 && index === 0
      }));

      const { error: insertError } = await supabase
        .from("business_photos")
        .insert(newPhotos);

      if (insertError) throw insertError;

      toast.success(`${uploadedUrls.length} foto(s) subida(s) correctamente`);
      await loadPhotos();
    } catch (error) {
      console.error("Error subiendo fotos:", error);
      toast.error("Error al subir las fotos");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    if (!confirm("¿Eliminar esta foto?")) return;

    try {
      // Delete from storage if it's from our storage
      if (photoUrl.includes('business-images')) {
        const path = photoUrl.split('business-images/')[1];
        if (path) {
          await supabase.storage.from('business-images').remove([path]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from("business_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;

      toast.success("Foto eliminada");
      await loadPhotos();
    } catch (error) {
      console.error("Error eliminando foto:", error);
      toast.error("Error al eliminar la foto");
    }
  };

  const toggleOrderingMode = () => {
    if (orderingMode) {
      // Salir del modo ordenar sin guardar
      setOrderingMode(false);
      setSelectedForOrder([]);
    } else {
      // Entrar en modo ordenar
      setOrderingMode(true);
      setSelectedForOrder([]);
    }
  };

  const handlePhotoClickInOrderMode = (photoId: string) => {
    if (!orderingMode) return;

    if (selectedForOrder.includes(photoId)) {
      // Si ya está seleccionada, deseleccionar
      setSelectedForOrder(prev => prev.filter(id => id !== photoId));
    } else {
      // Seleccionar en el orden actual
      setSelectedForOrder(prev => [...prev, photoId]);
    }
  };

  const saveNewOrder = async () => {
    if (selectedForOrder.length === 0) {
      toast.error("No has seleccionado ninguna foto");
      return;
    }

    try {
      setLoading(true);

      // Crear un nuevo array con el orden actualizado
      const orderedPhotos = selectedForOrder.map(id => 
        photos.find(p => p.id === id)!
      );
      
      const unorderedPhotos = photos.filter(p => 
        !selectedForOrder.includes(p.id)
      );

      const newOrderedPhotos = [...orderedPhotos, ...unorderedPhotos];

      // Actualizar en batch para mejor rendimiento
      const updates = newOrderedPhotos.map((photo, i) => ({
        id: photo.id,
        display_order: i + 1
      }));

      // Actualizar todos a la vez
      for (const update of updates) {
        const { error } = await supabase
          .from("business_photos")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast.success("Orden actualizado correctamente");
      setOrderingMode(false);
      setSelectedForOrder([]);
      await loadPhotos();
    } catch (error) {
      console.error("Error guardando orden:", error);
      toast.error("Error al guardar el orden");
    } finally {
      setLoading(false);
    }
  };

  const getPhotoOrderNumber = (photoId: string) => {
    const index = selectedForOrder.indexOf(photoId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImagePlus className="h-5 w-5" />
          Galería de Fotos
        </CardTitle>
        <CardDescription>
          Gestiona las fotos de tu negocio. La primera foto será la imagen principal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || loading}
          >
            <ImagePlus className="h-4 w-4 mr-2" />
            {uploading ? "Subiendo..." : "Añadir Fotos"}
          </Button>

          {photos.length > 0 && (
            <>
              <Button
                type="button"
                variant={orderingMode ? "default" : "outline"}
                onClick={toggleOrderingMode}
                disabled={loading}
              >
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {orderingMode ? "Cancelar" : "Ordenar"}
              </Button>

              {orderingMode && selectedForOrder.length > 0 && (
                <Button
                  type="button"
                  variant="default"
                  onClick={saveNewOrder}
                  disabled={loading}
                >
                  Guardar Orden ({selectedForOrder.length})
                </Button>
              )}
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/svg+xml"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {orderingMode && (
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium">
              Modo Ordenar: Haz clic en las fotos en el orden que deseas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Las fotos seleccionadas se colocarán al principio en el orden que las selecciones
            </p>
          </div>
        )}

        {loading && photos.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay fotos. Añade la primera foto de tu negocio.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photos.map((photo, index) => {
              const orderNumber = getPhotoOrderNumber(photo.id);
              const isSelected = selectedForOrder.includes(photo.id);

              return (
                <div
                  key={photo.id}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    orderingMode
                      ? isSelected
                        ? "border-primary shadow-lg scale-105"
                        : "border-border hover:border-primary/50 cursor-pointer"
                      : "border-border"
                  }`}
                  onClick={() => orderingMode && handlePhotoClickInOrderMode(photo.id)}
                >
                  <div className="aspect-square">
                    <img
                      src={photo.photo_url}
                      alt={`Foto ${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {index === 0 && !orderingMode && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-medium">
                      Principal
                    </div>
                  )}

                  {orderingMode && orderNumber && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
                      {orderNumber}
                    </div>
                  )}

                  {!orderingMode && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDeletePhoto(photo.id, photo.photo_url)}
                      className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
