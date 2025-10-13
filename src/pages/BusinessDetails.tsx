import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { MapPin, Phone, Mail, Globe, ArrowLeft, Calendar, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";

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
  booking_additional_message?: string | null;
}

export default function BusinessDetails() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    partySize: "2",
    bookingDate: undefined as Date | undefined,
    startTime: undefined as string | undefined,
    notes: "",
  });

  // Hook de disponibilidad
  const {
    isDateAvailable,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    hasAvailableTables,
    refreshAvailability,
    loading: availabilityLoading,
    tables,
  } = useBookingAvailability(businessId);

  const maxTableCapacity = tables.length > 0 ? Math.max(...tables.map((t) => t.max_capacity)) : 20;

  // 🔹 Cargar negocio desde Supabase
  useEffect(() => {
    if (!businessId) return;

    const loadBusiness = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .eq("is_active", true)
          .maybeSingle();

        if (error) throw error;
        setBusiness(data);
      } catch (error) {
        console.error("Error cargando negocio:", error);
        toast.error("No se pudo cargar la información del negocio");
      } finally {
        setLoading(false);
      }
    };

    loadBusiness();
  }, [businessId]);

  // 📅 Cambiar fecha
  const handleDateChange = (date: Date | undefined) => {
    setBookingForm({ ...bookingForm, bookingDate: date, startTime: undefined });
  };

  // 👥 Cambiar número de personas
  const handlePartySizeChange = (value: string) => {
    setBookingForm({ ...bookingForm, partySize: value, startTime: undefined });
  };

  // 💾 Enviar reserva
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingForm.clientName || !bookingForm.clientPhone || !bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const dateStr = format(bookingForm.bookingDate, "yyyy-MM-dd");

    // 🔄 Forzar actualización de disponibilidad antes de validar
    await refreshAvailability();

    // Esperar un momento para que se actualicen los datos
    await new Promise((resolve) => setTimeout(resolve, 500));

    const isStillAvailable = hasAvailableTables(dateStr, bookingForm.startTime, parseInt(bookingForm.partySize));

    if (!isStillAvailable) {
      toast.error("Lo sentimos, este horario ya no está disponible. Por favor selecciona otro.");
      setBookingForm({ ...bookingForm, startTime: undefined });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("public-booking", {
        body: {
          businessId,
          clientName: bookingForm.clientName,
          clientEmail: bookingForm.clientEmail || undefined,
          clientPhone: bookingForm.clientPhone,
          bookingDate: dateStr,
          startTime: bookingForm.startTime,
          partySize: parseInt(bookingForm.partySize),
          notes: bookingForm.notes || undefined,
        },
      });

      if (error) throw new Error(error.message || "Error al crear la reserva");
      if (!data || !data.success) throw new Error(data?.error || "Error al crear la reserva");

      toast.success("¡Reserva confirmada correctamente! Nos pondremos en contacto contigo pronto.");

      setBookingForm({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        partySize: "2",
        bookingDate: undefined,
        startTime: undefined,
        notes: "",
      });
    } catch (error) {
      console.error("Error creando reserva:", error);
      const msg = error instanceof Error ? error.message : "Error al enviar la reserva";

      if (msg.includes("not found") || msg.includes("not accepting")) {
        toast.error("Este negocio no está aceptando reservas en este momento");
      } else if (msg.includes("Too many")) {
        toast.error("Demasiadas solicitudes. Por favor, intenta más tarde");
      } else if (msg.includes("past dates")) {
        toast.error("No se pueden hacer reservas para fechas pasadas");
      } else {
        toast.error("Lo sentimos, no hay disponibilidad en esa fecha u hora. Por favor, selecciona otra opción.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openInGoogleMaps = () => {
    if (business?.address) {
      const encoded = encodeURIComponent(business.address);
      window.open(`https://www.google.com/maps?q=${encoded}`, "_blank", "noopener,noreferrer");
    }
  };

  // 🔍 Calcular horarios disponibles en tiempo real
  const getAvailableTimeSlotsForForm = (): string[] => {
    if (!bookingForm.bookingDate || !bookingForm.partySize) return [];

    const partySize = parseInt(bookingForm.partySize);
    if (isNaN(partySize) || partySize <= 0) return [];

    return getAvailableTimeSlots(bookingForm.bookingDate, partySize);
  };

  const availableTimeSlots = getAvailableTimeSlotsForForm();

  // Debug: Log para ver qué horarios están disponibles
  console.log("=== DEBUG DISPONIBILIDAD ===");
  console.log("Fecha seleccionada:", bookingForm.bookingDate);
  console.log("Número de personas:", bookingForm.partySize);
  console.log("Available time slots:", availableTimeSlots);
  console.log("===========================");

  // 🧱 Renderizado principal
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Negocio no encontrado</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Botón Volver - FUERA del banner */}
      <div className="border-b border-border bg-background">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="outline" size="sm" className="hover-scale">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner del negocio - Ocupa todo el ancho con esquinas redondeadas */}
      <div className="container mx-auto px-4 py-6">
        <Card className="overflow-hidden shadow-lg animate-fade-in">
          <div className="relative w-full h-64 md:h-80">
            {business.image_url ? (
              <img 
                src={business.image_url} 
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">{business.name}</h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium">{business.category}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Contenido principal - 3 columnas */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Columnas 1 y 2: Acerca de nosotros, Ubicación, Contacto */}
          <div className="lg:col-span-2 space-y-6">
            {/* Acerca de nosotros */}
            {business.description && (
              <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Users className="mr-2 h-6 w-6 text-primary" />
                    Acerca de nosotros
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{business.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Ubicación */}
            {business.address && (
              <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <MapPin className="mr-2 h-6 w-6 text-primary" />
                    Ubicación
                  </h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border mb-4">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD3G8p1Ca5ZxGiQfdDcKRZZwQI0TL40oVk&q=${encodeURIComponent(business.address)}`}
                      allowFullScreen
                    />
                  </div>
                  <Button variant="outline" className="w-full hover-scale" onClick={openInGoogleMaps}>
                    <MapPin className="mr-2 h-4 w-4" /> Abrir en Google Maps
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contacto */}
            {(business.phone || business.email) && (
              <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Phone className="mr-2 h-6 w-6 text-primary" />
                    Contacto
                  </h2>
                  <div className="space-y-3">
                    {business.phone && (
                      <a 
                        href={`tel:${business.phone}`}
                        className="flex items-center p-3 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-all hover-scale"
                      >
                        <Phone className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-medium">{business.phone}</span>
                      </a>
                    )}
                    {business.email && (
                      <a 
                        href={`mailto:${business.email}`}
                        className="flex items-center p-3 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-all hover-scale"
                      >
                        <Mail className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-medium">{business.email}</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Columna 3: Haz tu reserva */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 shadow-lg">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-semibold mb-4 flex items-center">
                  <Calendar className="mr-2 h-6 w-6 text-primary" />
                  Haz tu reserva
                </h3>
                
                {/* Mensaje adicional del negocio */}
                {business.booking_additional_message && (
                  <div className="mb-4 p-4 bg-primary/10 border-l-4 border-primary rounded-md animate-fade-in">
                    <p className="text-sm text-foreground font-medium">{business.booking_additional_message}</p>
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Teléfono *</Label>
                    <Input
                      type="tel"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div>
                    <Label>Número de personas *</Label>
                    <Select value={bookingForm.partySize} onValueChange={handlePartySizeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxTableCapacity }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? "persona" : "personas"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Fecha *</Label>
                    <DatePicker
                      date={bookingForm.bookingDate}
                      onDateChange={handleDateChange}
                      placeholder="Seleccionar fecha"
                      disabled={(d) => !isDateAvailable(d)}
                    />
                  </div>

                  <div>
                    <Label>Hora *</Label>
                    <Select
                      value={bookingForm.startTime ?? undefined}
                      onValueChange={(v) => setBookingForm({ ...bookingForm, startTime: v })}
                      disabled={!bookingForm.bookingDate || availabilityLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !bookingForm.bookingDate
                              ? "Selecciona una fecha primero"
                              : availableTimeSlots.length === 0
                                ? "No hay horarios disponibles"
                                : "Seleccionar hora"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.length > 0 ? (
                          availableTimeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              <div className="flex items-center justify-between w-full">
                                <span>{time}</span>
                                <span className="text-xs text-green-600 ml-2">✓ Disponible</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : bookingForm.bookingDate ? (
                          <SelectItem disabled value="no-slots">
                            <div className="flex items-center justify-between w-full">
                              <span>No hay horarios disponibles</span>
                              <span className="text-xs text-red-600 ml-2">✗ Completo</span>
                            </div>
                          </SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notas adicionales</Label>
                    <Textarea
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover-scale"
                    disabled={submitting || !bookingForm.bookingDate || !bookingForm.startTime || availabilityLoading}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {submitting ? "Enviando..." : "Confirmar reserva"}
                  </Button>
                </form>

                {/* Botones de contacto - Alineados horizontalmente con separación */}
                {(business.phone || business.email) && (
                  <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3 text-center">¿Prefieres contactarnos directamente?</p>
                    <div className="flex gap-3">
                      {business.phone && (
                        <a href={`tel:${business.phone}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full hover-scale">
                            <Phone className="mr-2 h-4 w-4" />
                            Llámanos
                          </Button>
                        </a>
                      )}
                      {business.email && (
                        <a href={`mailto:${business.email}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full hover-scale">
                            <Mail className="mr-2 h-4 w-4" />
                            Escríbenos
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
