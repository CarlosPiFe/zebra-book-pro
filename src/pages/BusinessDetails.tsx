import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MapPin, Phone, Mail, Globe, ArrowLeft, Calendar, Clock, Users, CheckCircle2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import { getTimeSlotId } from "@/lib/timeSlots";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import jsPDF from "jspdf";
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

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

export default function BusinessDetails() {
  const {
    businessId
  } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Estados para el modal de confirmación
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Booking form state (sin clientEmail porque se obtiene del usuario autenticado)
  const [bookingForm, setBookingForm] = useState({
    clientName: "",
    clientPhone: "",
    partySize: "2",
    roomId: undefined as string | undefined,
    bookingDate: undefined as Date | undefined,
    startTime: undefined as string | undefined,
    notes: ""
  });
  const [phoneError, setPhoneError] = useState<string>("");

  // Hook de disponibilidad
  const {
    isDateAvailable,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    hasAvailableTables,
    refreshAvailability,
    loading: availabilityLoading,
    tables
  } = useBookingAvailability(businessId, bookingForm.roomId);
  const maxTableCapacity = tables.length > 0 ? Math.max(...tables.map(t => t.max_capacity)) : 20;

  // 🔐 Verificar autenticación y cargar perfil
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Cargar perfil del usuario si está autenticado
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        setUserProfile(profile);
        
        // Autocompletar nombre y teléfono del perfil si existen
        if (profile) {
          if (profile.full_name) {
            setBookingForm(prev => ({
              ...prev,
              clientName: profile.full_name
            }));
          }
          if (profile.phone) {
            setBookingForm(prev => ({
              ...prev,
              clientPhone: profile.phone
            }));
          }
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        // Limpiar formulario si se cierra sesión
        setBookingForm(prev => ({
          ...prev,
          clientName: "",
          clientPhone: ""
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔹 Cargar negocio y salas desde Supabase
  useEffect(() => {
    if (!businessId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar negocio
        const {
          data: businessData,
          error: businessError
        } = await supabase.from("businesses").select("*").eq("id", businessId).eq("is_active", true).maybeSingle();
        if (businessError) throw businessError;
        setBusiness(businessData);

        // Cargar salas activas
        const {
          data: roomsData,
          error: roomsError
        } = await supabase
          .from("business_rooms")
          .select("id, name, is_active")
          .eq("business_id", businessId)
          .eq("is_active", true)
          .order("name");
        
        if (roomsError) throw roomsError;
        setRooms(roomsData || []);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("No se pudo cargar la información del negocio");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [businessId]);

  // 📅 Cambiar fecha
  const handleDateChange = (date: Date | undefined) => {
    setBookingForm({
      ...bookingForm,
      bookingDate: date,
      startTime: undefined
    });
  };

  // 👥 Cambiar número de personas
  const handlePartySizeChange = (value: string) => {
    setBookingForm({
      ...bookingForm,
      partySize: value,
      startTime: undefined
    });
  };

  // 🏠 Cambiar sala
  const handleRoomChange = (value: string) => {
    setBookingForm({
      ...bookingForm,
      roomId: value === "all-rooms" ? undefined : value,
      bookingDate: undefined,
      startTime: undefined
    });
  };

  // Validar teléfono
  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) {
      setPhoneError("");
      return false;
    }

    // El componente PhoneInput ya incluye el prefijo, solo validamos que tenga contenido válido
    // Eliminar espacios y caracteres especiales excepto +
    const digitsOnly = phone.replace(/[\s\-()]/g, '');

    // Debe empezar con + y tener al menos 10 caracteres (+XX XXXXXXX)
    if (!digitsOnly.startsWith('+') || digitsOnly.length < 10) {
      setPhoneError("Introduce un número de teléfono válido.");
      return false;
    }

    // Verificar que después del + solo haya dígitos
    const afterPlus = digitsOnly.substring(1);
    if (!/^\d+$/.test(afterPlus)) {
      setPhoneError("Introduce un número de teléfono válido.");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // 💾 Enviar reserva - Usando el edge function public-booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar autenticación
    if (!user?.email) {
      toast.error("Debes iniciar sesión para hacer una reserva");
      navigate("/auth");
      return;
    }

    if (!bookingForm.clientName || !bookingForm.clientPhone || !bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    // Validar teléfono antes de enviar
    if (!validatePhone(bookingForm.clientPhone)) {
      toast.error("Por favor introduce un número de teléfono válido");
      return;
    }
    const dateStr = format(bookingForm.bookingDate, "yyyy-MM-dd");
    const partySize = parseInt(bookingForm.partySize);
    setSubmitting(true);
    try {
      // Llamar al edge function public-booking que maneja el booking_mode
      // Usar el email del usuario autenticado
      const {
        data,
        error
      } = await supabase.functions.invoke('public-booking', {
        body: {
          businessId: businessId,
          clientId: user.id, // Incluir el ID del usuario autenticado
          clientName: bookingForm.clientName,
          clientEmail: user.email,
          clientPhone: bookingForm.clientPhone,
          bookingDate: dateStr,
          startTime: bookingForm.startTime,
          partySize: partySize,
          roomId: bookingForm.roomId || undefined,
          notes: bookingForm.notes || undefined
        }
      });
      if (error) {
        console.error("Error en la reserva:", error);
        throw error;
      }
      if (!data.success) {
        throw new Error(data.error || "Error al crear la reserva");
      }

      // Mostrar modal de confirmación en lugar de toast
      if (data.booking) {
        setConfirmedBooking(data.booking);
        setShowConfirmationModal(true);
        
        // Resetear formulario
        setBookingForm({
          clientName: "",
          clientPhone: "",
          partySize: "2",
          roomId: undefined,
          bookingDate: undefined,
          startTime: undefined,
          notes: ""
        });
        await refreshAvailability();
      }
    } catch (error: any) {
      console.error("Error creando reserva:", error);

      // Mensajes de error más específicos
      if (error?.message?.includes("availability") || error?.message?.includes("disponibilidad")) {
        toast.error(error.message);
      } else if (error?.message?.includes("rate limit")) {
        toast.error("Demasiadas solicitudes. Por favor, espera un momento e intenta de nuevo.");
      } else {
        toast.error(error?.message || "No se pudo crear la reserva. Por favor, intenta de nuevo.");
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

  // Función para generar y descargar PDF de la reserva
  const handleDownloadPDF = () => {
    if (!confirmedBooking || !business) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Confirmación de Reserva", pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Nombre del negocio
    doc.setFontSize(16);
    doc.setFont("helvetica", "normal");
    doc.text(business.name, pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    // Estado de la reserva
    doc.setFontSize(12);
    const statusText = confirmedBooking.status === 'reserved' 
      ? "✓ CONFIRMADA AUTOMÁTICAMENTE" 
      : "⏰ PENDIENTE DE CONFIRMACIÓN";
    doc.text(statusText, pageWidth / 2, yPos, { align: "center" });
    yPos += 15;

    // Línea separadora
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Información de la reserva
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Información del Cliente:", 20, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${confirmedBooking.client_name}`, 25, yPos);
    yPos += 6;
    doc.text(`Teléfono: ${confirmedBooking.client_phone}`, 25, yPos);
    yPos += 6;
    if (confirmedBooking.client_email) {
      doc.text(`Email: ${confirmedBooking.client_email}`, 25, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Detalles de la reserva
    doc.setFont("helvetica", "bold");
    doc.text("Detalles de la Reserva:", 20, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    const formattedDate = format(new Date(confirmedBooking.booking_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Fecha: ${formattedDate}`, 25, yPos);
    yPos += 6;
    doc.text(`Hora: ${confirmedBooking.start_time} - ${confirmedBooking.end_time}`, 25, yPos);
    yPos += 6;
    doc.text(`Número de personas: ${confirmedBooking.party_size}`, 25, yPos);
    yPos += 6;

    // Sala
    if (confirmedBooking.room_id) {
      const room = rooms.find(r => r.id === confirmedBooking.room_id);
      if (room) {
        doc.text(`Sala: ${room.name}`, 25, yPos);
        yPos += 6;
      }
    }

    // Notas
    if (confirmedBooking.notes) {
      yPos += 3;
      doc.setFont("helvetica", "bold");
      doc.text("Notas adicionales:", 20, yPos);
      yPos += 7;
      doc.setFont("helvetica", "normal");
      
      // Dividir las notas en líneas si son muy largas
      const notesLines = doc.splitTextToSize(confirmedBooking.notes, pageWidth - 50);
      notesLines.forEach((line: string) => {
        doc.text(line, 25, yPos);
        yPos += 6;
      });
    }

    yPos += 10;

    // Información de contacto del negocio
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Información de Contacto:", 20, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    if (business.phone) {
      doc.text(`Teléfono: ${business.phone}`, 25, yPos);
      yPos += 6;
    }
    if (business.email) {
      doc.text(`Email: ${business.email}`, 25, yPos);
      yPos += 6;
    }
    if (business.address) {
      doc.text(`Dirección: ${business.address}`, 25, yPos);
      yPos += 6;
    }

    // Mensaje final según el estado
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    if (confirmedBooking.status === 'reserved') {
      doc.text(`Tu mesa ha sido asignada. ¡Te esperamos en ${business.name}!`, pageWidth / 2, yPos, { align: "center" });
    } else {
      doc.text(`El negocio revisará tu solicitud y te contactará pronto para confirmar.`, pageWidth / 2, yPos, { align: "center" });
    }

    // Pie de página con fecha de generación
    yPos = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const generatedDate = format(new Date(), "dd/MM/yyyy HH:mm");
    doc.text(`Documento generado el ${generatedDate}`, pageWidth / 2, yPos, { align: "center" });

    // Guardar PDF
    const fileName = `reserva-${business.name.replace(/\s+/g, '-')}-${format(new Date(confirmedBooking.booking_date), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
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
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>;
  }
  if (!business) {
    return <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h1 className="text-2xl font-bold mb-4">Negocio no encontrado</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al inicio
            </Button>
          </Link>
        </div>
      </div>;
  }
  return <>
    {/* Modal de confirmación de reserva */}
    <Dialog open={showConfirmationModal} onOpenChange={setShowConfirmationModal}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0">
        {confirmedBooking && (
          <>
            {/* Icono circular de estado - Fijo en la parte superior */}
            <div className="flex justify-center pt-6 pb-4 px-6">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
                confirmedBooking.status === 'reserved' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-orange-100 dark:bg-orange-900/30'
              }`}>
                {confirmedBooking.status === 'reserved' ? (
                  <CheckCircle2 className="w-14 h-14 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-14 h-14 text-orange-600 dark:text-orange-400" />
                )}
              </div>
            </div>

            {/* Título dinámico - Fijo en la parte superior */}
            <DialogHeader className="px-6 pb-4">
              <DialogTitle className="text-center text-2xl">
                {confirmedBooking.status === 'reserved' 
                  ? '¡Reserva Confirmada!' 
                  : 'Reserva Recibida'}
              </DialogTitle>
            </DialogHeader>

            {/* Contenido scrolleable */}
            <ScrollArea className="max-h-[calc(90vh-220px)] px-6">
              <div className="space-y-4 pb-6">
                {/* Mensaje según el estado */}
                <div className={`p-4 rounded-lg border ${
                  confirmedBooking.status === 'reserved'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                  <p className="text-sm text-center">
                    {confirmedBooking.status === 'reserved'
                      ? `Tu mesa ha sido asignada. ¡Te esperamos en ${business.name}!`
                      : 'El negocio revisará tu solicitud y te contactará pronto para confirmar.'}
                  </p>
                </div>

                {/* Información del cliente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Información del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nombre:</span>
                      <span className="font-medium">{confirmedBooking.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span className="font-medium">{confirmedBooking.client_phone}</span>
                    </div>
                    {confirmedBooking.client_email && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium text-xs">{confirmedBooking.client_email}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detalles de la reserva */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Detalles de la Reserva</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-start justify-between">
                      <span className="text-muted-foreground">Fecha:</span>
                      <span className="font-medium text-right">
                        {format(new Date(confirmedBooking.booking_date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hora:</span>
                      <span className="font-medium">{confirmedBooking.start_time} - {confirmedBooking.end_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Personas:</span>
                      <span className="font-medium">{confirmedBooking.party_size}</span>
                    </div>
                    {confirmedBooking.room_id && rooms.find(r => r.id === confirmedBooking.room_id) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sala:</span>
                        <span className="font-medium">
                          {rooms.find(r => r.id === confirmedBooking.room_id)?.name}
                        </span>
                      </div>
                    )}
                    {confirmedBooking.notes && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground block mb-1">Notas:</span>
                        <p className="text-sm">{confirmedBooking.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Botón de descarga PDF */}
                <Button 
                  onClick={handleDownloadPDF} 
                  className="w-full"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar Reserva (PDF)
                </Button>

                {/* Botón cerrar */}
                <Button 
                  onClick={() => setShowConfirmationModal(false)} 
                  className="w-full"
                >
                  Cerrar
                </Button>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>

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
            {business.image_url ? <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />}
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
            {business.description && <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Users className="mr-2 h-6 w-6 text-primary" />
                    Acerca de nosotros
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{business.description}</p>
                </CardContent>
              </Card>}

            {/* Ubicación */}
            {business.address && <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <MapPin className="mr-2 h-6 w-6 text-primary" />
                    Ubicación
                  </h2>
                  <div className="aspect-video w-full rounded-lg overflow-hidden border border-border mb-4">
                    <iframe width="100%" height="100%" frameBorder="0" style={{
                  border: 0
                }} src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD3G8p1Ca5ZxGiQfdDcKRZZwQI0TL40oVk&q=${encodeURIComponent(business.address)}`} allowFullScreen />
                  </div>
                  <Button variant="outline" className="w-full hover-scale" onClick={openInGoogleMaps}>
                    <MapPin className="mr-2 h-4 w-4" /> Abrir en Google Maps
                  </Button>
                </CardContent>
              </Card>}

            {/* Contacto */}
            {(business.phone || business.email) && <Card className="shadow-md hover-scale transition-all">
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-4 flex items-center">
                    <Phone className="mr-2 h-6 w-6 text-primary" />
                    Contacto
                  </h2>
                  <div className="space-y-3">
                    {business.phone && <a href={`tel:${business.phone}`} className="flex items-center p-3 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-all hover-scale">
                        <Phone className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-medium">{business.phone}</span>
                      </a>}
                    {business.email && <a href={`mailto:${business.email}`} className="flex items-center p-3 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-all hover-scale">
                        <Mail className="mr-3 h-5 w-5 text-primary" />
                        <span className="font-medium">{business.email}</span>
                      </a>}
                  </div>
                </CardContent>
              </Card>}
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
                {business.booking_additional_message && <div className="mb-4 p-4 bg-primary/10 border-l-4 border-primary rounded-md animate-fade-in">
                    <p className="text-sm text-foreground font-medium">{business.booking_additional_message}</p>
                  </div>}

                {!user && (
                  <div className="mb-4 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-md">
                    <p className="text-sm text-foreground font-medium">
                      Debes <Link to="/auth" className="underline font-bold">iniciar sesión</Link> para hacer una reserva
                    </p>
                  </div>
                )}

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input 
                      value={bookingForm.clientName} 
                      onChange={e => setBookingForm({
                        ...bookingForm,
                        clientName: e.target.value
                      })} 
                      disabled={!user}
                    />
                  </div>

                  <div>
                    <Label>Teléfono *</Label>
                    <PhoneInput 
                      defaultCountry="es" 
                      value={bookingForm.clientPhone} 
                      onChange={phone => {
                        setBookingForm({
                          ...bookingForm,
                          clientPhone: phone
                        });
                        if (phone) {
                          validatePhone(phone);
                        } else {
                          setPhoneError("");
                        }
                      }} 
                      inputClassName={phoneError ? "!border-destructive" : ""} 
                      className="phone-input-custom px-0 text-base mx-0"
                      disabled={!user}
                    />
                    {phoneError && <p className="text-sm text-destructive mt-1">{phoneError}</p>}
                  </div>

                  <div>
                    <Label>Número de personas *</Label>
                    <Select value={bookingForm.partySize} onValueChange={handlePartySizeChange} disabled={!user}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({
                        length: maxTableCapacity
                      }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>
                            {n} {n === 1 ? "persona" : "personas"}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selector de sala */}
                  {rooms.length > 0 && (
                    <div>
                      <Label>Elegir sala</Label>
                      <Select value={bookingForm.roomId || "all-rooms"} onValueChange={handleRoomChange} disabled={!user}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas las salas" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-rooms">Todas las salas</SelectItem>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Fecha *</Label>
                    <DatePicker 
                      date={bookingForm.bookingDate} 
                      onDateChange={handleDateChange} 
                      placeholder="Seleccionar fecha" 
                      disabled={!user ? () => true : (d => !isDateAvailable(d))} 
                    />
                  </div>

                  <div>
                    <Label>Hora *</Label>
                    <Select 
                      value={bookingForm.startTime ?? undefined} 
                      onValueChange={v => setBookingForm({
                        ...bookingForm,
                        startTime: v
                      })} 
                      disabled={!user || !bookingForm.bookingDate || availabilityLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={!bookingForm.bookingDate ? "Selecciona una fecha primero" : availableTimeSlots.length === 0 ? "No hay horarios disponibles" : "Seleccionar hora"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimeSlots.length > 0 ? availableTimeSlots.map(time => <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>) : bookingForm.bookingDate ? <SelectItem disabled value="no-slots">
                            No hay horarios disponibles
                          </SelectItem> : null}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Notas adicionales</Label>
                    <Textarea 
                      value={bookingForm.notes} 
                      onChange={e => setBookingForm({
                        ...bookingForm,
                        notes: e.target.value
                      })} 
                      disabled={!user}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover-scale" 
                    disabled={!user || submitting || !bookingForm.bookingDate || !bookingForm.startTime || availabilityLoading || !!phoneError || !bookingForm.clientPhone}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {submitting ? "Enviando..." : "Confirmar reserva"}
                  </Button>
                </form>

                {/* Botones de contacto - Alineados horizontalmente con separación */}
                {(business.phone || business.email) && <div className="mt-6 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3 text-center">¿Prefieres contactarnos directamente?</p>
                    <div className="flex gap-3">
                      {business.phone && <a href={`tel:${business.phone}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full hover-scale">
                            <Phone className="mr-2 h-4 w-4" />
                            Llámanos
                          </Button>
                        </a>}
                      {business.email && <a href={`mailto:${business.email}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full hover-scale">
                            <Mail className="mr-2 h-4 w-4" />
                            Escríbenos
                          </Button>
                        </a>}
                    </div>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </>;
}