import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface Photo {
  id: string;
  photo_url: string;
}

interface PhotoGalleryDialogProps {
  photos: Photo[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

export function PhotoGalleryDialog({
  photos,
  open,
  onOpenChange
}: PhotoGalleryDialogProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-6">
          <div className="relative w-full h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Galería de fotos</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4 pb-4">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Foto ${index + 1}`}
                      loading={index < 6 ? "eager" : "lazy"}
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground mt-2">
              {photos.length} fotos
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para foto ampliada */}
      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-fit h-fit p-0 bg-black/95">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 z-50 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
            {selectedPhoto && (
              <img
                src={selectedPhoto.photo_url}
                alt="Foto ampliada"
                className="max-w-[90vw] max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
