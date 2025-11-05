import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
  onOpenChange,
  initialIndex = 0
}: PhotoGalleryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0">
        <div className="relative w-full h-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <X className="h-4 w-4" />
          </Button>

          <Carousel
            opts={{
              align: "center",
              loop: true,
              startIndex: initialIndex
            }}
            className="w-full h-full"
          >
            <CarouselContent className="h-full">
              {photos.map((photo, index) => (
                <CarouselItem key={photo.id} className="h-full">
                  <div className="flex items-center justify-center h-full p-8">
                    <img
                      src={photo.photo_url}
                      alt={`Foto ${index + 1}`}
                      loading={index < 2 ? "eager" : "lazy"}
                      decoding="async"
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
            {photos.length} fotos
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
