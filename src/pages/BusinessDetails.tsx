import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { format, startOfDay, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { parseDateTimeInMadrid, formatDateInMadrid } from "@/lib/timezone";
import { ArrowLeft, Calendar, Clock, CheckCircle2, Download, Info, Phone, Mail, Heart, Star, MapPin, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBookingAvailability } from "@/hooks/useBookingAvailability";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import jsPDF from "jspdf";
import { formatPhoneNumber } from "@/lib/utils";
import { BusinessTabs } from "@/components/business/BusinessTabs";
import { useFavorites } from "@/hooks/useFavorites";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  price_range?: string | null;
  average_rating?: number | null;
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
  const [isFavorite, setIsFavorite] = useState(false);
  const { toggleFavorite, loading: favoriteLoading } = useFavorites();
  
  // Estados para el modal de confirmación
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Estado para el wizard multi-paso
  const [step, setStep] = useState<'details' | 'time' | 'contact'>('details');
  const [selectedShift, setSelectedShift] = useState<'lunch' | 'dinner' | null>(null);

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

  // Hook de disponibilidad (sin filtro de sala inicial)
  const {
    isDateAvailable,
    getAvailableTimeSlots,
    refreshAvailability,
    tables: allTables,
    availabilitySlots
  } = useBookingAvailability(businessId, undefined);
  
  const maxTableCapacity = allTables.length > 0 ? Math.max(...allTables.map(t => t.max_capacity)) : 20;

  // 🔐 Verificar autenticación y cargar perfil
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Verificar si este negocio está en favoritos
      if (user && businessId) {
        const { data } = await supabase
          .from("favorites")
          .select("*")
          .eq("client_id", user.id)
          .eq("business_id", businessId)
          .maybeSingle();
        
        setIsFavorite(!!data);
      }
      
      // Cargar perfil del usuario si está autenticado
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        // Autocompletar nombre y teléfono del perfil si existen
        if (profile) {
          if (profile.full_name) {
            setBookingForm(prev => ({
              ...prev,
              clientName: profile.full_name || ""
            }));
          }
          if (profile.phone) {
            setBookingForm(prev => ({
              ...prev,
              clientPhone: profile.phone || ""
            }));
          }
        }
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        // Limpiar formulario si se cierra sesión
        setBookingForm(prev => ({
          ...prev,
          clientName: "",
          clientPhone: ""
        }));
        setIsFavorite(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [businessId]);

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

  // Manejar favoritos
  const handleToggleFavorite = async () => {
    if (!businessId) return;
    const newStatus = await toggleFavorite(businessId, user?.id, isFavorite);
    setIsFavorite(newStatus);
  };

  // 💾 Enviar reserva - Usando el edge function public-booking
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingForm.bookingDate || !bookingForm.startTime) {
      toast.error("Por favor, completa todos los campos requeridos");
      return;
    }

    // --- NUEVA VALIDACIÓN DE HORA PASADA ---
    try {
      // Usar fecha local del navegador para comparar
      const selectedDateTime = parseDateTimeInMadrid(
        formatDateInMadrid(bookingForm.bookingDate),
        bookingForm.startTime
      );
      const now = new Date(); // Hora actual del navegador

      // Compara si la hora seleccionada es anterior a la hora actual
      if (isBefore(selectedDateTime, now)) {
        toast.error('La hora seleccionada ya ha pasado. Por favor, elige una hora futura.');
        setSubmitting(false);
        return;
      }
    } catch (e) {
      console.error("Error validando fecha/hora:", e);
      toast.error("Error al validar la hora seleccionada.");
      setSubmitting(false);
      return;
    }
    // --- FIN NUEVA VALIDACIÓN ---

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
    const statusText = confirmedBooking.status === 'confirmed' 
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
      doc.text(`Teléfono: ${formatPhoneNumber(business.phone)}`, 25, yPos);
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
    if (confirmedBooking.status === 'confirmed') {
      doc.text(`Tu reserva ha sido confirmada. ¡Te esperamos en ${business.name}!`, pageWidth / 2, yPos, { align: "center" });
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


  // Función para detectar turnos basado en availability_slots
  const detectShifts = (date: Date): { hasShifts: boolean; lunch?: { start: string; end: string }; dinner?: { start: string; end: string } } => {
    const dayOfWeek = date.getDay();
    const daySlots = availabilitySlots.filter(slot => slot.day_of_week === dayOfWeek);
    
    if (daySlots.length === 0) {
      return { hasShifts: false };
    }

    // Ordenar los slots por hora de inicio
    const sortedSlots = daySlots.sort((a, b) => {
      const aMinutes = parseInt(a.start_time?.split(':')[0] || '0') * 60 + parseInt(a.start_time?.split(':')[1] || '0');
      const bMinutes = parseInt(b.start_time?.split(':')[0] || '0') * 60 + parseInt(b.start_time?.split(':')[1] || '0');
      return aMinutes - bMinutes;
    });

    // Detectar si hay un gran hueco (más de 2 horas) entre grupos de slots
    let gaps: number[] = [];
    for (let i = 0; i < sortedSlots.length - 1; i++) {
      const endMinutes = parseInt(sortedSlots[i]?.end_time?.split(':')[0] || '0') * 60 + parseInt(sortedSlots[i]?.end_time?.split(':')[1] || '0');
      const nextStartMinutes = parseInt(sortedSlots[i + 1]?.start_time?.split(':')[0] || '0') * 60 + parseInt(sortedSlots[i + 1]?.start_time?.split(':')[1] || '0');
      const gap = nextStartMinutes - endMinutes;
      if (gap > 120) {
        gaps.push(i);
      }
    }

    // Si hay un hueco grande, hay turnos
    if (gaps.length > 0 && gaps[0] !== undefined) {
      const splitIndex = gaps[0];
      const firstSlot = sortedSlots[0];
      const splitSlot = sortedSlots[splitIndex];
      const nextSlot = sortedSlots[splitIndex + 1];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      
      if (!firstSlot || !splitSlot || !nextSlot || !lastSlot) {
        return { hasShifts: false };
      }

      return {
        hasShifts: true,
        lunch: {
          start: firstSlot.start_time,
          end: splitSlot.end_time,
        },
        dinner: {
          start: nextSlot.start_time,
          end: lastSlot.end_time,
        },
      };
    }

    return { hasShifts: false };
  };

  // Generar botones de acceso rápido para los próximos 7 días
  const generateQuickDateButtons = () => {
    const buttons = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const isAvailable = isDateAvailable(date);
      if (isAvailable) {
        buttons.push({
          date,
          label: i === 0 ? 'Hoy' : format(date, 'EEE', { locale: es }),
          dayNumber: format(date, 'd'),
        });
      }
    }
    return buttons;
  };

  const quickDateButtons = generateQuickDateButtons();

  // Obtener los slots filtrados por turno si se ha seleccionado
  const getFilteredTimeSlotsByShift = (): string[] => {
    if (!bookingForm.bookingDate || !bookingForm.partySize) return [];
    
    const allSlots = availableTimeSlots;
    
    if (!selectedShift) return allSlots;
    
    const shifts = detectShifts(bookingForm.bookingDate);
    if (!shifts.hasShifts) return allSlots;

    const shiftInfo = selectedShift === 'lunch' ? shifts.lunch : shifts.dinner;
    if (!shiftInfo) return allSlots;

    // Filtrar slots que caen dentro del rango del turno
    return allSlots.filter(time => {
      const timeMinutes = parseInt(time?.split(':')[0] || '0') * 60 + parseInt(time?.split(':')[1] || '0');
      const startMinutes = parseInt(shiftInfo.start?.split(':')[0] || '0') * 60 + parseInt(shiftInfo.start?.split(':')[1] || '0');
      const endMinutes = parseInt(shiftInfo.end?.split(':')[0] || '0') * 60 + parseInt(shiftInfo.end?.split(':')[1] || '0');
      return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
    });
  };

  const filteredTimeSlots = getFilteredTimeSlotsByShift();
  
  // Validar si se puede avanzar al siguiente paso
  const canProceedToTimeStep = bookingForm.partySize && bookingForm.bookingDate && (
    !bookingForm.bookingDate || 
    !detectShifts(bookingForm.bookingDate).hasShifts || 
    selectedShift !== null
  );

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
        <LoadingSpinner size="xl" />
      </div>
    );
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
      <DialogContent className="max-w-md max-h-[95vh] p-0 gap-0">
        {confirmedBooking && (
          <>
            {/* Icono circular de estado - Fijo en la parte superior */}
            <div className="flex justify-center pt-4 pb-2 px-4">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                confirmedBooking.status === 'confirmed' 
                  ? 'bg-green-100 dark:bg-green-900/30' 
                  : 'bg-orange-100 dark:bg-orange-900/30'
              }`}>
                {confirmedBooking.status === 'confirmed' ? (
                  <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-12 h-12 text-orange-600 dark:text-orange-400" />
                )}
              </div>
            </div>

            {/* Título dinámico - Fijo en la parte superior */}
            <DialogHeader className="px-4 pb-2">
              <DialogTitle className="text-center text-xl">
                {confirmedBooking.status === 'confirmed' 
                  ? '¡Reserva Confirmada!' 
                  : 'Reserva Recibida'}
              </DialogTitle>
            </DialogHeader>

            {/* Contenido scrolleable */}
            <ScrollArea className="max-h-[calc(95vh-160px)] px-4">
              <div className="space-y-2.5 pb-4">
                {/* Mensaje según el estado */}
                <div className={`p-3 rounded-lg border ${
                  confirmedBooking.status === 'confirmed'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                }`}>
                  <p className="text-sm text-center">
                    {confirmedBooking.status === 'confirmed'
                      ? `¡Tu reserva ha sido confirmada! Te esperamos en ${business.name}.`
                      : 'El negocio revisará tu solicitud y te contactará pronto para confirmar.'}
                  </p>
                </div>

                {/* Información del cliente */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Información del Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
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
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Detalles de la Reserva</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 text-sm">
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
                      <div className="pt-1.5 border-t">
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
      {/* Botón Volver */}
      <div className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
          </Link>
        </div>
      </div>

      {/* Header del restaurante */}
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-3xl font-bold mb-2">{business.name}</h1>
            <div className="space-y-1 text-sm text-muted-foreground">
              {business.address && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {business.address}
                </p>
              )}
              <p className="flex items-center gap-1">
                <UtensilsCrossed className="h-3 w-3" />
                {business.category}
                {business.price_range && ` · ${business.price_range}`}
              </p>
              {business.average_rating && (
                <p className="flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {business.average_rating.toFixed(1)} (Opiniones)
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-primary h-10 w-10"
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
        </div>

        {/* Galería de fotos estilo grid */}
        <div className="grid grid-cols-4 grid-rows-2 gap-1 h-[350px] rounded-lg overflow-hidden">
          {business.image_url ? (
            <>
              <div className="col-span-2 row-span-2">
                <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-2 row-span-1">
                <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-1 row-span-1">
                <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
              </div>
              <div className="col-span-1 row-span-1 relative">
                <img src={business.image_url} alt={business.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">Ver más fotos</span>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-4 row-span-2 bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Sin fotos disponibles</p>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal - 2 columnas */}
      <div className="container mx-auto px-4 pb-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Columna izquierda (2/3): Tabs con toda la información */}
          <div className="lg:col-span-2">
            <BusinessTabs business={business} />
          </div>

          {/* Columna derecha (1/3): Haz tu reserva */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20 shadow-md relative">
              {submitting && <LoadingOverlay />}
              <CardContent className="pt-5 pb-5">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  Haz tu reserva
                </h3>
                
                {/* Mensaje adicional del negocio */}
                {business.booking_additional_message && <div className="mb-3 p-3 bg-primary/10 border-l-4 border-primary rounded-md">
                    <p className="text-xs text-foreground font-medium">{business.booking_additional_message}</p>
                  </div>}

                {!user && (
                  <Alert variant="info" className="mb-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs font-medium">
                      Debes <Link to="/auth" className="underline font-bold hover:text-accent-blue/80">iniciar sesión</Link> para hacer una reserva
                    </AlertDescription>
                  </Alert>
                )}

                {/* PASO 1: Detalles (Qué, Cuándo, Turno) */}
                {step === 'details' && (
                  <div className="space-y-4">
                    {/* 1. Número de personas */}
                    <div>
                      <Label className="text-sm">Número de personas *</Label>
                      <Select value={bookingForm.partySize} onValueChange={handlePartySizeChange} disabled={!user}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: maxTableCapacity }, (_, i) => i + 1).map(n => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? "persona" : "personas"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 2. Botones de acceso rápido para fecha */}
                    <div>
                      <Label className="text-sm mb-2 block">Fecha *</Label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {quickDateButtons.map(({ date, label, dayNumber }) => (
                          <Button
                            key={date.toISOString()}
                            type="button"
                            variant={bookingForm.bookingDate?.toDateString() === date.toDateString() ? "default" : "outline"}
                            className="flex-shrink-0 flex-col h-auto py-2 px-3"
                            onClick={() => handleDateChange(date)}
                            disabled={!user}
                          >
                            <span className="text-xs">{label}</span>
                            <span className="text-lg font-semibold">{dayNumber}</span>
                          </Button>
                        ))}
                      </div>
                      {/* Calendario completo */}
                      <DatePicker 
                        date={bookingForm.bookingDate} 
                        onDateChange={handleDateChange} 
                        placeholder="O selecciona otra fecha" 
                        disabled={!user ? () => true : (date => {
                          const todayStart = startOfDay(new Date());
                          const isBeforeToday = date < todayStart;
                          const isClosedDay = !isDateAvailable(date);
                          return isBeforeToday || isClosedDay;
                        })} 
                      />
                    </div>

                    {/* 3. Selector de turno (solo si hay turnos) */}
                    {bookingForm.bookingDate && detectShifts(bookingForm.bookingDate).hasShifts && (
                      <div>
                        <Label className="text-sm mb-2 block">Reservar para *</Label>
                        <ToggleGroup 
                          type="single" 
                          value={selectedShift || undefined}
                          onValueChange={(value) => setSelectedShift(value as 'lunch' | 'dinner' | null)}
                          className="justify-stretch"
                        >
                          {detectShifts(bookingForm.bookingDate).lunch && (
                            <ToggleGroupItem 
                              value="lunch" 
                              className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              Comida ({detectShifts(bookingForm.bookingDate).lunch?.start} - {detectShifts(bookingForm.bookingDate).lunch?.end})
                            </ToggleGroupItem>
                          )}
                          {detectShifts(bookingForm.bookingDate).dinner && (
                            <ToggleGroupItem 
                              value="dinner" 
                              className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                            >
                              Cena ({detectShifts(bookingForm.bookingDate).dinner?.start} - {detectShifts(bookingForm.bookingDate).dinner?.end})
                            </ToggleGroupItem>
                          )}
                        </ToggleGroup>
                      </div>
                    )}

                    {/* Botón continuar */}
                    <Button 
                      type="button"
                      className="w-full" 
                      onClick={() => setStep('time')}
                      disabled={!canProceedToTimeStep || !user}
                    >
                      Continuar
                    </Button>
                  </div>
                )}

                {/* PASO 2: Selección de Hora */}
                {step === 'time' && (
                  <div className="space-y-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('details')}
                      className="mb-2"
                    >
                      ← Volver
                    </Button>

                    <div>
                      <Label className="text-sm mb-3 block">Selecciona una hora</Label>
                      {filteredTimeSlots.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {filteredTimeSlots.map(time => (
                            <Button
                              key={time}
                              type="button"
                              variant={bookingForm.startTime === time ? "default" : "outline"}
                              className="h-12"
                              onClick={() => {
                                setBookingForm({ ...bookingForm, startTime: time });
                                setStep('contact');
                              }}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            No hay horarios disponibles para esta fecha y número de personas.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                )}

                {/* PASO 3: Contacto y Confirmación */}
                {step === 'contact' && (
                  <>
                    {!user ? (
                      <div className="space-y-4">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            Ya casi lo tienes. Inicia sesión o crea una cuenta para confirmar tu reserva.
                          </AlertDescription>
                        </Alert>
                        <div className="flex gap-2">
                          <Link to="/auth" className="flex-1">
                            <Button variant="default" className="w-full">
                              Iniciar Sesión
                            </Button>
                          </Link>
                          <Link to="/auth?register=true" className="flex-1">
                            <Button variant="outline" className="w-full">
                              Registrarse
                            </Button>
                          </Link>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStep('time')}
                          className="w-full"
                        >
                          ← Volver
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleBookingSubmit} className="space-y-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setStep('time')}
                          className="mb-2"
                        >
                          ← Volver
                        </Button>

                        {/* Email (solo lectura) */}
                        <div>
                          <Label className="text-sm">Email</Label>
                          <Input 
                            value={user.email || ''} 
                            disabled
                            className="h-10 text-sm bg-muted"
                          />
                        </div>

                        {/* Nombre (editable) */}
                        <div>
                          <Label className="text-sm">Nombre *</Label>
                          <Input 
                            value={bookingForm.clientName} 
                            onChange={e => setBookingForm({
                              ...bookingForm,
                              clientName: e.target.value
                            })} 
                            className="h-10 text-sm"
                          />
                        </div>

                        {/* Teléfono (editable) */}
                        <div>
                          <Label className="text-sm">Teléfono *</Label>
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
                            inputClassName={phoneError ? "!border-destructive h-10" : "h-10"} 
                            className="phone-input-custom text-sm"
                          />
                          {phoneError && <p className="text-xs text-destructive mt-1">{phoneError}</p>}
                        </div>

                        {/* Notas adicionales */}
                        <div>
                          <Label className="text-sm">Notas adicionales</Label>
                          <Textarea 
                            value={bookingForm.notes} 
                            onChange={e => setBookingForm({
                              ...bookingForm,
                              notes: e.target.value
                            })} 
                            className="text-sm"
                            rows={3}
                          />
                        </div>

                        {/* Botón de confirmación */}
                        <Button 
                          type="submit" 
                          className="w-full h-10 text-sm font-semibold" 
                          disabled={submitting || !bookingForm.clientName || !bookingForm.clientPhone || !!phoneError}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {submitting ? "Enviando..." : "Confirmar reserva"}
                        </Button>
                      </form>
                    )}
                  </>
                )}

                {/* Botones de contacto - Alineados horizontalmente con separación */}
                {(business.phone || business.email) && <div className="mt-4 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 text-center">¿Prefieres contactarnos directamente?</p>
                    <div className="flex gap-2">
                      {business.phone && <a href={`tel:${business.phone}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs h-9">
                            <Phone className="mr-1 h-3 w-3" />
                            Llámanos
                          </Button>
                        </a>}
                      {business.email && <a href={`mailto:${business.email}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full text-xs h-9">
                            <Mail className="mr-1 h-3 w-3" />
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