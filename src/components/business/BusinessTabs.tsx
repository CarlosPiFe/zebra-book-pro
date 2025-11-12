import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { MapPin, Phone, Mail, Star, UtensilsCrossed, Image as ImageIcon, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatPhoneNumber } from "@/lib/utils";

interface Business {
  id: string;
  name: string;
  cuisine_type: string | null;
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  website: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  };
}

interface BusinessPhoto {
  id: string;
  photo_url: string;
  is_main: boolean;
  display_order: number;
}

interface BusinessTabsProps {
  business: Business;
}

export const BusinessTabs = ({ business }: BusinessTabsProps) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [photos, setPhotos] = useState<BusinessPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState<number>(0);

  useEffect(() => {
    loadTabData();
  }, [business.id]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      // Cargar menú
      const { data: menuData } = await supabase
        .from("menu_items")
        .select("*")
        .eq("business_id", business.id)
        .order("category");

      setMenuItems(menuData || []);

      // Cargar opiniones
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles (
            full_name
          )
        `)
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });

      setReviews(reviewsData as any || []);

      // Calcular valoración media
      if (reviewsData && reviewsData.length > 0) {
        const avg = reviewsData.reduce((acc: number, r: any) => acc + r.rating, 0) / reviewsData.length;
        setAverageRating(avg);
      }

      // Cargar fotos
      const { data: photosData } = await supabase
        .from("business_photos")
        .select("*")
        .eq("business_id", business.id)
        .order("display_order");

      setPhotos(photosData || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (business.address) {
      const encoded = encodeURIComponent(business.address);
      window.open(`https://www.google.com/maps?q=${encoded}`, "_blank", "noopener,noreferrer");
    }
  };

  const groupedMenuItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category]!.push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="info">Información</TabsTrigger>
        <TabsTrigger value="menu">
          Carta {menuItems.length > 0 && `(${menuItems.length})`}
        </TabsTrigger>
        <TabsTrigger value="reviews">
          Opiniones {reviews.length > 0 && `(${reviews.length})`}
        </TabsTrigger>
        <TabsTrigger value="photos">
          Fotos {photos.length > 0 && `(${photos.length})`}
        </TabsTrigger>
      </TabsList>

      {/* Información */}
      <TabsContent value="info" className="space-y-6">
        {business.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Acerca de nosotros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{business.description}</p>
            </CardContent>
          </Card>
        )}

        {business.address && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video w-full rounded-lg overflow-hidden border">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD3G8p1Ca5ZxGiQfdDcKRZZwQI0TL40oVk&q=${encodeURIComponent(
                    business.address
                  )}`}
                  allowFullScreen
                />
              </div>
              <Button variant="outline" className="w-full" onClick={openInGoogleMaps}>
                <MapPin className="mr-2 h-4 w-4" />
                Abrir en Google Maps
              </Button>
            </CardContent>
          </Card>
        )}

        {(business.phone || business.email) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Phone className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">{formatPhoneNumber(business.phone)}</span>
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <Mail className="mr-3 h-5 w-5 text-primary" />
                  <span className="font-medium">{business.email}</span>
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Carta / Menú */}
      <TabsContent value="menu">
        {menuItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Este restaurante aún no ha publicado su carta
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UtensilsCrossed className="h-5 w-5" />
                    {category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        <span className="font-bold text-primary ml-4">{item.price.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Opiniones */}
      <TabsContent value="reviews" className="space-y-6">
        {reviews.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold flex items-center gap-2">
                    <Star className="h-8 w-8 fill-primary text-primary" />
                    {averageRating.toFixed(1)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reviews.length} {reviews.length === 1 ? "opinión" : "opiniones"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Aún no hay opiniones para este restaurante. ¡Sé el primero en opinar!
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">
                          {review.profiles?.full_name || "Usuario"}
                        </span>
                        <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                          <Star className="h-4 w-4 fill-primary" />
                          {review.rating}/10
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {format(new Date(review.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                      {review.comment && (
                        <p className="text-sm mt-2">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Fotos */}
      <TabsContent value="photos">
        {photos.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              Este restaurante aún no ha publicado fotos
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-lg overflow-hidden border hover:scale-105 transition-transform cursor-pointer"
              >
                <img
                  src={photo.photo_url}
                  alt={business.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
