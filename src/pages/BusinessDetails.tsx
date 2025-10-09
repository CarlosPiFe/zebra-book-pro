import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Phone, Mail, Globe, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Business {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  image_url: string | null;
  website: string | null;
  social_media: any;
}

export default function BusinessDetails() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  const loadBusiness = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .eq("is_active", true)
        .single();

      if (error) throw error;

      setBusiness(data);
    } catch (error) {
      console.error("Error loading business:", error);
      toast.error("No se pudo cargar la información del negocio");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Negocio no encontrado</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Image and Title */}
        <div className="mb-8">
          {business.image_url ? (
            <div className="relative h-96 w-full rounded-xl overflow-hidden mb-6">
              <img
                src={business.image_url}
                alt={business.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  {business.name}
                </h1>
                <p className="text-lg text-muted-foreground">{business.category}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
              <p className="text-lg text-muted-foreground">{business.category}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            {business.description && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Acerca de nosotros</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {business.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Contact Information */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Información de contacto</h2>
                <div className="space-y-4">
                  {business.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Teléfono</p>
                        <a
                          href={`tel:${business.phone}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {business.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {business.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Correo electrónico</p>
                        <a
                          href={`mailto:${business.email}`}
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {business.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {business.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Dirección</p>
                        <p className="text-muted-foreground">{business.address}</p>
                      </div>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Sitio web</p>
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          {business.website}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Social Media */}
            {business.social_media && Object.keys(business.social_media).length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Redes sociales</h2>
                  <div className="flex flex-wrap gap-3">
                    {business.social_media.facebook && (
                      <a
                        href={business.social_media.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium">Facebook</span>
                      </a>
                    )}
                    {business.social_media.instagram && (
                      <a
                        href={business.social_media.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium">Instagram</span>
                      </a>
                    )}
                    {business.social_media.twitter && (
                      <a
                        href={business.social_media.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium">Twitter</span>
                      </a>
                    )}
                    {business.social_media.linkedin && (
                      <a
                        href={business.social_media.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                      >
                        <span className="font-medium">LinkedIn</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Haz tu reserva</h3>
                <p className="text-muted-foreground mb-6">
                  Contacta directamente con el negocio para hacer tu reserva
                </p>
                <div className="space-y-3">
                  {business.phone && (
                    <Button className="w-full" asChild>
                      <a href={`tel:${business.phone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Llamar ahora
                      </a>
                    </Button>
                  )}
                  {business.website && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={business.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="mr-2 h-4 w-4" />
                        Visitar sitio web
                      </a>
                    </Button>
                  )}
                  {business.email && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={`mailto:${business.email}`}>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar email
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
