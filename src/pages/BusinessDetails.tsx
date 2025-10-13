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
  const [loadingHours, setLoadingHours] = useState(false);
  const [hoursLoaded, setHoursLoaded] = useState(false);

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
    loading: availabilityLoading,
    tables,
  } = useBookingAvailability(businessId);

  // Capacidad máxima según mesas
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

  // 🔹 Cargar horas disponibles manual o automáticamente
  const handleLoadHours = async () => {
    if (!bookingForm.bookingDate) {
      toast.error("Por favor selecciona una fecha primero");
      return;
    }

    setLoadingHours(true);
    try {
      const slots = getTimeSlotsWithAvailability(bookingForm.bookingDate, parseInt(bookingForm.partySize));
      if (slots.length === 0) {
        toast.error("No hay horarios disponibles para la fecha y número de personas seleccionadas");
      } else {
        const availableCount = slots.filter((s) => s.available).length;
        if (availableCount === 0) {
          toast.warning("Todos los horarios están completos para esta fecha");
        } else {
          toast.success(`${availableCount} ${availableCount === 1 ? "horario disponible" : "horarios disponibles"}`);
        }
      }
      setHoursLoaded(true);
    } finally {
      setLoadingHours(false);
    }
  };

  // 🔄 Recalcular horas automáticamente al cambiar fecha o número de personas
  useEffect(() => {
    if (bookingForm.bookingDate && !availabilityLoading) {
      handleLoadHours();
    }
  }, [bookingForm.bookingDate, bookingForm.partySize]);

  // 📅 Cambiar fecha
  const handleDateChange = (date: Date | undefined) => {
    setBookingForm({ ...bookingForm, bookingDate: date, startTime: undefined });
    setHoursLoaded(false);
  };

  // 👥 Cambiar número de personas
  const partySizeHasAvailability = (partySize: number): boolean => {
    if (!bookingForm.bookingDate) return true;
    const availableSlots = getAvailableTimeSlots(bookingForm.bookingDate, partySize);
    return availableSlots.length > 0;
  };

  const handlePartySizeChange = (value: string) => {
    const newPartySize = parseInt(value);
    setBookingForm({ ...bookingForm, partySize: value, startTime: undefined });
    setHoursLoaded(false);

    if (bookingForm.bookingDate && !partySizeHasAvailability(newPartySize)) {
      toast.warning(
        `No hay disponibilidad para ${newPartySize} ${
          newPartySize === 1 ? "persona" : "personas"
        } en esta fecha. Por favor selecciona otra fecha.`,
      );
    }
  };

  // 💾 Enviar reserva
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingForm.clientName || !bookingForm.clientPhone || !bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    const dateStr = format(bookingForm.bookingDate, "yyyy-MM-dd");
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
      setHoursLoaded(false);
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

  // 🗺️ Abrir Google Maps
  const openInGoogleMaps = () => {
    if (business?.address) {
      const encodedAddress = encodeURIComponent(business.address);
      window.open(`https://www.google.com/maps?q=${encodedAddress}`, "_blank", "noopener,noreferrer");
    }
  };

  // 💡 Horas con disponibilidad
  const timeSlotsWithAvailability = bookingForm.bookingDate
    ? getTimeSlotsWithAvailability(bookingForm.bookingDate, parseInt(bookingForm.partySize))
    : [];

  const availableTimeSlots = bookingForm.bookingDate
    ? getAvailableTimeSlots(bookingForm.bookingDate, parseInt(bookingForm.partySize))
    : [];

  // 🧱 Render UI
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
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 🧩 UI principal (formulario incluido)
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </Link>
        </div>
      </div>

      {/* Contenido */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Imagen principal */}
        {business.image_url && (
          <div className="relative h-96 w-full rounded-xl overflow-hidden mb-6">
            <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">{business.name}</h1>
              <p className="text-lg text-muted-foreground">{business.category}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Información y contacto */}
          <div className="lg:col-span-2 space-y-6">
            {business.description && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Acerca de nosotros</h2>
                  <p className="text-muted-foreground leading-relaxed">{business.description}</p>
                </CardContent>
              </Card>
            )}

            {business.address && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Ubicación</h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD3G8p1Ca5ZxGiQfdDcKRZZwQI0TL40oVk&q=${encodeURIComponent(business.address)}`}
                      allowFullScreen
                    />
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={openInGoogleMaps}>
                    <MapPin className="mr-2 h-4 w-4" /> Abrir en Google Maps
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contacto */}
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-2xl font-semibold mb-4">Información de contacto</h2>
                <div className="space-y-3 text-muted-foreground">
                  {business.phone && (
                    <p>
                      📞 <a href={`tel:${business.phone}`}>{business.phone}</a>
                    </p>
                  )}
                  {business.email && (
                    <p>
                      ✉️ <a href={`mailto:${business.email}`}>{business.email}</a>
                    </p>
                  )}
                  {business.website && (
                    <p>
                      🌐{" "}
                      <a href={business.website} target="_blank" rel="noopener noreferrer">
                        {business.website}
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de reserva */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Haz tu reserva</h3>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="clientName">Nombre *</Label>
                    <Input
                      id="clientName"
                      value={bookingForm.clientName}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="clientPhone">Teléfono *</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={bookingForm.clientPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientPhone: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Número de personas *</Label>
                    <Select value={bookingForm.partySize} onValueChange={handlePartySizeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: maxTableCapacity }, (_, i) => i + 1).map((num) => {
                          const available = bookingForm.bookingDate ? partySizeHasAvailability(num) : true;
                          return (
                            <SelectItem
                              key={num}
                              value={String(num)}
                              disabled={bookingForm.bookingDate && !available}
                              className={bookingForm.bookingDate && !available ? "opacity-50" : ""}
                            >
                              {num} {num === 1 ? "persona" : "personas"}
                              {bookingForm.bookingDate && !available && (
                                <span className="text-xs text-muted-foreground ml-2">sin disponibilidad</span>
                              )}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Fecha *</Label>
                    <DatePicker
                      date={bookingForm.bookingDate}
                      onDateChange={handleDateChange}
                      placeholder="Seleccionar fecha"
                      disabled={(date) => !isDateAvailable(date)}
                    />
                  </div>

                  <div>
                    <Label>Hora *</Label>
                    {!hoursLoaded ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleLoadHours}
                        disabled={!bookingForm.bookingDate || availabilityLoading || loadingHours}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {loadingHours ? "Cargando..." : "Mostrar horas disponibles"}
                      </Button>
                    ) : (
                      <Select
                        value={bookingForm.startTime ?? undefined}
                        onValueChange={(value) => {
                          const slot = timeSlotsWithAvailability.find((s) => s.time === value);
                          if (slot && slot.available) {
                            setBookingForm({ ...bookingForm, startTime: value });
                          } else {
                            setBookingForm({ ...bookingForm, startTime: undefined });
                          }
                        }}
                        disabled={!bookingForm.bookingDate || timeSlotsWithAvailability.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !bookingForm.bookingDate
                                ? "Primero selecciona una fecha"
                                : timeSlotsWithAvailability.length === 0
                                  ? "No hay horarios disponibles"
                                  : "Seleccionar hora"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-[100]">
                          {timeSlotsWithAvailability.filter((s) => s.available).length > 0 ? (
                            timeSlotsWithAvailability
                              .filter((s) => s.available)
                              .map((s) => (
                                <SelectItem key={s.time} value={s.time}>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" /> <span>{s.time}</span>
                                  </div>
                                </SelectItem>
                              ))
                          ) : (
                            <SelectItem value="no-slots" disabled>
                              No hay horarios disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas adicionales</Label>
                    <Textarea
                      id="notes"
                      value={bookingForm.notes}
                      onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                      placeholder="Ej: Necesito silla alta para bebé"
                      rows={3}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                    disabled={
                      submitting ||
                      !bookingForm.startTime ||
                      !bookingForm.bookingDate ||
                      !partySizeHasAvailability(parseInt(bookingForm.partySize)) ||
                      availabilityLoading
                    }
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {submitting ? "Enviando..." : availabilityLoading ? "Verificando..." : "Confirmar reserva"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
