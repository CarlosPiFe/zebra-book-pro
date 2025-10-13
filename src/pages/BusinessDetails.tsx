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
    startTime: "",
    notes: "",
  });

  // Estado para controlar si se han cargado las horas
  const [hoursLoaded, setHoursLoaded] = useState(false);

  // Use availability hook
  const {
    isDateAvailable,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    getNextAvailableSlot,
    hasAvailableTables,
    loading: availabilityLoading,
    tables,
  } = useBookingAvailability(businessId);

  // Calculate maximum capacity based on largest table
  const maxTableCapacity = tables.length > 0 ? Math.max(...tables.map((table) => table.max_capacity)) : 20; // Default fallback if no tables

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
        .maybeSingle();

      if (error) throw error;

      setBusiness(data);
    } catch (error) {
      console.error("Error loading business:", error);
      toast.error("No se pudo cargar la información del negocio");
    } finally {
      setLoading(false);
    }
  };
  // 🔄 Recalcular automáticamente las horas disponibles al cambiar fecha o personas
  useEffect(() => {
    if (bookingForm.bookingDate && !availabilityLoading) {
      handleLoadHours();
    }
  }, [bookingForm.bookingDate, bookingForm.partySize]);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingForm.clientName || !bookingForm.clientPhone || !bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    // Validar disponibilidad en tiempo real antes de enviar
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
          bookingDate: format(bookingForm.bookingDate, "yyyy-MM-dd"),
          startTime: bookingForm.startTime,
          partySize: parseInt(bookingForm.partySize),
          notes: bookingForm.notes || undefined,
        },
      });

      if (error) {
        console.error("Booking error:", error);
        throw new Error(error.message || "Error al crear la reserva");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Error al crear la reserva");
      }

      toast.success("¡Reserva confirmada correctamente! Nos pondremos en contacto contigo pronto.");
      setBookingForm({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        partySize: "2",
        bookingDate: undefined,
        startTime: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error creating booking:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al enviar la reserva";

      if (errorMessage.includes("not found") || errorMessage.includes("not accepting")) {
        toast.error("Este negocio no está aceptando reservas en este momento");
      } else if (errorMessage.includes("Too many")) {
        toast.error("Demasiadas solicitudes. Por favor, intenta más tarde");
      } else if (errorMessage.includes("past dates")) {
        toast.error("No se pueden hacer reservas para fechas pasadas");
      } else {
        toast.error("Lo sentimos, no hay disponibilidad en esa fecha u hora. Por favor, selecciona otra opción.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    setBookingForm({ ...bookingForm, bookingDate: date, startTime: "" });
    setHoursLoaded(false); // Reset cuando cambia la fecha
  };

  // Get all time slots with availability info for selected date
  const timeSlotsWithAvailability = bookingForm.bookingDate
    ? getTimeSlotsWithAvailability(bookingForm.bookingDate, parseInt(bookingForm.partySize))
    : [];

  // Get available time slots for selected date
  const availableTimeSlots = bookingForm.bookingDate
    ? getAvailableTimeSlots(bookingForm.bookingDate, parseInt(bookingForm.partySize))
    : [];

  // Check if a party size has any availability for the selected date
  const partySizeHasAvailability = (partySize: number): boolean => {
    if (!bookingForm.bookingDate) return true; // Can't check without date
    const availableSlots = getAvailableTimeSlots(bookingForm.bookingDate, partySize);
    return availableSlots.length > 0;
  };

  // Handle party size change
  const handlePartySizeChange = (value: string) => {
    const newPartySize = parseInt(value);
    setBookingForm({ ...bookingForm, partySize: value, startTime: "" });
    setHoursLoaded(false); // Reset cuando cambia el número de personas

    // Show warning if selected party size has no availability
    if (bookingForm.bookingDate && !partySizeHasAvailability(newPartySize)) {
      toast.warning(
        `No hay disponibilidad para ${newPartySize} ${newPartySize === 1 ? "persona" : "personas"} en esta fecha. Por favor selecciona otra fecha.`,
      );
    }
  };

  // Función para cargar las horas disponibles
  const handleLoadHours = () => {
    if (!bookingForm.bookingDate) {
      toast.error("Por favor selecciona una fecha primero");
      return;
    }

    // Ejecutar la comprobación de disponibilidad
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
  };

  const openInGoogleMaps = () => {
    if (business?.address) {
      const encodedAddress = encodeURIComponent(business.address);
      const link = document.createElement("a");
      link.href = `https://www.google.com/maps?q=${encodedAddress}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
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
              <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">{business.name}</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna izquierda: Secciones de información - Columnas 1 y 2 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Acerca de nosotros */}
            {business.description && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Acerca de nosotros</h2>
                  <p className="text-muted-foreground leading-relaxed">{business.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Ubicación (Mapa) */}
            {business.address && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4">Ubicación</h2>
                  <div className="space-y-4">
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
                    <Button variant="outline" className="w-full" onClick={openInGoogleMaps}>
                      <MapPin className="mr-2 h-4 w-4" />
                      Abrir en Google Maps
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información de contacto */}
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

          {/* Columna derecha: Formulario de reserva - Columna 3, sticky */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold mb-4">Haz tu reserva</h3>

                {business.booking_additional_message && (
                  <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm leading-relaxed text-foreground">{business.booking_additional_message}</p>
                  </div>
                )}

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
                    <Label htmlFor="clientEmail">Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={bookingForm.clientEmail}
                      onChange={(e) => setBookingForm({ ...bookingForm, clientEmail: e.target.value })}
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
                          const hasAvailability = bookingForm.bookingDate ? partySizeHasAvailability(num) : true;
                          return (
                            <SelectItem
                              key={num}
                              value={String(num)}
                              disabled={bookingForm.bookingDate && !hasAvailability}
                              className={bookingForm.bookingDate && !hasAvailability ? "opacity-50" : ""}
                            >
                              <div className="flex items-center gap-2 justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {num} {num === 1 ? "persona" : "personas"}
                                </div>
                                {bookingForm.bookingDate && !hasAvailability && (
                                  <span className="text-xs text-muted-foreground ml-2">sin disponibilidad</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {parseInt(bookingForm.partySize) > maxTableCapacity && (
                      <p className="text-sm text-destructive mt-1">
                        Para reservas de más de {maxTableCapacity} personas, contáctanos.
                      </p>
                    )}
                    {bookingForm.bookingDate && !partySizeHasAvailability(parseInt(bookingForm.partySize)) && (
                      <p className="text-sm text-destructive mt-1">
                        No hay disponibilidad para {bookingForm.partySize}{" "}
                        {parseInt(bookingForm.partySize) === 1 ? "persona" : "personas"} en esta fecha.
                      </p>
                    )}
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
                    <Label>Hora de entrada *</Label>

                    {!hoursLoaded ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleLoadHours}
                        disabled={!bookingForm.bookingDate || availabilityLoading}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {availabilityLoading ? "Cargando..." : "Mostrar horas disponibles"}
                      </Button>
                    ) : (
                      <Select
                        // Aseguramos que el valor sea undefined cuando no haya hora seleccionada
                        value={bookingForm.startTime ?? undefined}
                        onValueChange={(value) => {
                          const slot = timeSlotsWithAvailability.find((s) => s.time === value);
                          if (slot && slot.available) {
                            setBookingForm({ ...bookingForm, startTime: value });
                          } else {
                            // Si el slot no está disponible o se deselecciona, limpiar el campo
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
                          {timeSlotsWithAvailability.filter((slot) => slot.available).length > 0 ? (
                            timeSlotsWithAvailability
                              .filter((slot) => slot.available)
                              .map((slot) => (
                                <SelectItem key={slot.time} value={slot.time} className="cursor-pointer">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    <span>{slot.time}</span>
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

                    {parseInt(bookingForm.partySize) > maxTableCapacity && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Para reservas de más de {maxTableCapacity} personas, contáctanos.
                      </p>
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
                  {bookingForm.bookingDate && availableTimeSlots.length === 0 && (
                    <p className="text-sm text-center text-muted-foreground">
                      No hay horarios disponibles para la fecha y número de personas seleccionadas.
                    </p>
                  )}
                </form>

                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  <p className="text-sm text-muted-foreground text-center mb-3">O contacta directamente</p>
                  {business.phone && (
                    <Button variant="outline" className="w-full" asChild>
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
