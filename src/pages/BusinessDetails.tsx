import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
// import { format } from "date-fns"; // <-- ELIMINADO
import { es } from 'date-fns/locale';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBookingAvailability } from '@/hooks/useBookingAvailability';
// import { getTimeSlotId } from "@/lib/timeSlots"; // <-- ELIMINADO
import { getMadridDateString, formatForDisplay } from '@/lib/timezone'; // <-- AÑADIDO
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import jsPDF from 'jspdf';
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
  const { businessId } = useParams();
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

  // --- ESTADOS DEL FORMULARIO Y HOOKS (MODIFICADO) ---
  const [bookingForm, setBookingForm] = useState({
    clientName: '',
    clientPhone: '',
    partySize: '2',
    roomId: undefined as string | undefined,
    bookingDate: undefined as Date | undefined,
    startTime: undefined as string | undefined,
    notes: '',
  });
  const [phoneError, setPhoneError] = useState<string>('');
  const [isDateLoading, setIsDateLoading] = useState(false); // Para el check de DatePicker

  // Hook de disponibilidad (¡NUEVO!)
  const {
    loading: availabilityLoading,
    slots, // 'slots' son los que ya vienen con { time, available }
    fetchAvailability,
    isDateAvailable,
  } = useBookingAvailability(businessId);

  // Límite de UI, la validación real está en el servidor.
  // El hook antiguo calculaba esto, pero ya no es necesario. Usamos 20 como fallback.
  const maxTableCapacity = 20;

  // 🔐 Verificar autenticación y cargar perfil (SIN CAMBIOS)
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      // Cargar perfil del usuario si está autenticado
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setUserProfile(profile);

        // Autocompletar nombre y teléfono del perfil si existen
        if (profile) {
          if (profile.full_name) {
            setBookingForm((prev) => ({
              ...prev,
              clientName: profile.full_name,
            }));
          }
          if (profile.phone) {
            setBookingForm((prev) => ({
              ...prev,
              clientPhone: profile.phone,
            }));
          }
        }
      }
    };
    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        // Limpiar formulario si se cierra sesión
        setBookingForm((prev) => ({
          ...prev,
          clientName: '',
          clientPhone: '',
        }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔹 Cargar negocio y salas desde Supabase (SIN CAMBIOS)
  useEffect(() => {
    if (!businessId) return;
    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar negocio
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .eq('is_active', true)
          .maybeSingle();
        if (businessError) throw businessError;
        setBusiness(businessData);

        // Cargar salas activas
        const { data: roomsData, error: roomsError } = await supabase
          .from('business_rooms')
          .select('id, name, is_active')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name');

        if (roomsError) throw roomsError;
        setRooms(roomsData || []);
      } catch (error) {
        console.error('Error cargando datos:', error);
        toast.error('No se pudo cargar la información del negocio');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [businessId]);

  // --- LÓGICA DE FORMULARIO (MODIFICADO) ---

  // 📅 Hook para buscar disponibilidad CUANDO cambian los inputs (NUEVO)
  useEffect(() => {
    if (
      !bookingForm.bookingDate ||
      !bookingForm.partySize ||
      availabilityLoading
    ) {
      // setSlots([]); // El hook ya lo maneja
      return;
    }

    const partySizeNum = parseInt(bookingForm.partySize);
    if (isNaN(partySizeNum) || partySizeNum <= 0) {
      // setSlots([]); // El hook ya lo maneja
      return;
    }

    // ¡Llamar al nuevo hook!
    fetchAvailability(
      bookingForm.bookingDate,
      partySizeNum,
      bookingForm.roomId,
    );
  }, [
    bookingForm.bookingDate,
    bookingForm.partySize,
    bookingForm.roomId,
    fetchAvailability,
    availabilityLoading,
  ]);

  // 📅 Cambiar fecha
  const handleDateChange = (date: Date | undefined) => {
    setBookingForm({
      ...bookingForm,
      bookingDate: date,
      startTime: undefined,
    });
  };

  // 👥 Cambiar número de personas
  const handlePartySizeChange = (value: string) => {
    setBookingForm({
      ...bookingForm,
      partySize: value,
      startTime: undefined,
    });
  };

  // 🏠 Cambiar sala
  const handleRoomChange = (value: string) => {
    setBookingForm({
      ...bookingForm,
      roomId: value === 'all-rooms' ? undefined : value,
      bookingDate: undefined,
      startTime: undefined,
    });
  };

  // Validar teléfono (SIN CAMBIOS)
  const validatePhone = (phone: string): boolean => {
    if (!phone.trim()) {
      setPhoneError('');
      return false;
    }
    const digitsOnly = phone.replace(/[\s\-()]/g, '');
    if (!digitsOnly.startsWith('+') || digitsOnly.length < 10) {
      setPhoneError('Introduce un número de teléfono válido.');
      return false;
    }
    const afterPlus = digitsOnly.substring(1);
    if (!/^\d+$/.test(afterPlus)) {
      setPhoneError('Introduce un número de teléfono válido.');
      return false;
    }
    setPhoneError('');
    return true;
  };

  // 💾 Enviar reserva - (MODIFICADO)
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar autenticación
    if (!user?.email) {
      toast.error('Debes iniciar sesión para hacer una reserva');
      navigate('/auth');
      return;
    }

    if (
      !bookingForm.clientName ||
      !bookingForm.clientPhone ||
      !bookingForm.bookingDate ||
      !bookingForm.startTime
    ) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    // Validar teléfono antes de enviar
    if (!validatePhone(bookingForm.clientPhone)) {
      toast.error('Por favor introduce un número de teléfono válido');
      return;
    }

    // ¡AQUÍ LA CORRECCIÓN DE TIMEZONE!
    const dateStr = getMadridDateString(bookingForm.bookingDate);
    const partySize = parseInt(bookingForm.partySize);
    setSubmitting(true);
    try {
      // Llamar al edge function public-booking que maneja el booking_mode
      const { data, error } = await supabase.functions.invoke(
        'public-booking',
        {
          body: {
            businessId: businessId,
            clientId: user.id,
            clientName: bookingForm.clientName,
            clientEmail: user.email,
            clientPhone: bookingForm.clientPhone,
            bookingDate: dateStr, // <-- ¡FECHA CORREGIDA!
            startTime: bookingForm.startTime,
            partySize: partySize,
            roomId: bookingForm.roomId || undefined,
            notes: bookingForm.notes || undefined,
          },
        },
      );
      if (error) {
        console.error('Error en la reserva:', error);
        throw error;
      }
      if (!data.success) {
        throw new Error(data.error || 'Error al crear la reserva');
      }

      // Mostrar modal de confirmación
      if (data.booking) {
        setConfirmedBooking(data.booking);
        setShowConfirmationModal(true);

        // Resetear formulario
        setBookingForm({
          clientName: '',
          clientPhone: '',
          partySize: '2',
          roomId: undefined,
          bookingDate: undefined,
          startTime: undefined,
          notes: '',
        });
        // No necesitamos 'refreshAvailability()', la suscripción de Supabase
        // (que deberíamos añadir al nuevo hook) lo haría, pero
        // por ahora, simplemente reseteamos.
      }
    } catch (error: any) {
      console.error('Error creando reserva:', error);
      if (
        error?.message?.includes('availability') ||
        error?.message?.includes('disponibilidad')
      ) {
        toast.error(error.message);
      } else if (error?.message?.includes('rate limit')) {
        toast.error(
          'Demasiadas solicitudes. Por favor, espera un momento e intenta de nuevo.',
        );
      } else {
        toast.error(
          error?.message || 'No se pudo crear la reserva. Por favor, intenta de nuevo.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // openInGoogleMaps (SIN CAMBIOS)
  const openInGoogleMaps = () => {
    if (business?.address) {
      const encoded = encodeURIComponent(business.address);
      window.open(
        `https://www.google.com/maps?q=${encoded}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  // handleDownloadPDF (MODIFICADO)
  const handleDownloadPDF = () => {
    if (!confirmedBooking || !business) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Título
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Confirmación de Reserva', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;

    // ... (resto de la lógica del PDF sin cambios) ...

    // ¡AQUÍ LA CORRECCIÓN DE FORMATO DE FECHA!
    const formattedDate = formatForDisplay(
      confirmedBooking.booking_date,
      "EEEE, d 'de' MMMM 'de' yyyy",
    );
    doc.text(`Fecha: ${formattedDate}`, 25, yPos);
    yPos += 6;

    // ... (resto de la lógica del PDF sin cambios) ...

    // Pie de página con fecha de generación
    yPos = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    // Usamos formatForDisplay para la fecha de generación
    const generatedDate = formatForDisplay(new Date(), 'dd/MM/yyyy HH:mm');
    doc.text(`Documento generado el ${generatedDate}`, pageWidth / 2, yPos, {
      align: 'center',
    });

    // Guardar PDF
    const fileName = `reserva-${business.name.replace(/\s+/g, '-')}-${
      confirmedBooking.booking_date
    }.pdf`;
    doc.save(fileName);
  };

  // --- LÓGICA DE RENDERIZADO (MODIFICADO) ---

  // BORRAR ESTAS LÍNEAS:
  // const getAvailableTimeSlotsForForm = (): string[] => { ... };
  // const availableTimeSlots = getAvailableTimeSlotsForForm();
  // console.log("=== DEBUG DISPONIBILIDAD ===");

  // AÑADIR ESTA NUEVA LÓGICA:
  const finalAvailableSlots = useMemo(() => {
    return slots.filter((slot) => slot.available).map((slot) => slot.time);
  }, [slots]);

  const handleDateDisabled = async (date: Date): Promise<boolean> => {
    // setIsDateLoading(true); // Evitar spinner en cada día
    const available = await isDateAvailable(date);
    // setIsDateLoading(false);
    return !available; // Devuelve true si está DESHABILITADO
  };

  // --- RENDERIZADO PRINCIPAL (MODIFICADO) ---

  if (loading) {
    // ... (sin cambios)
  }
  if (!business) {
    // ... (sin cambios)
  }
  return (
    <>
      {/* Modal de confirmación de reserva (SIN CAMBIOS) */}
      <Dialog
        open={showConfirmationModal}
        onOpenChange={setShowConfirmationModal}
      >
        {/* ... (contenido del modal sin cambios) ... */}
        <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0">
          {confirmedBooking && (
            <>
              {/* Icono circular de estado - Fijo en la parte superior */}
              <div className="flex justify-center pt-6 pb-4 px-6">
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center ${
                    confirmedBooking.status === 'reserved'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-orange-100 dark:bg-orange-900/30'
                  }`}
                >
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
                  <div
                    className={`p-4 rounded-lg border ${
                      confirmedBooking.status === 'reserved'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    }`}
                  >
                    <p className="text-sm text-center">
                      {confirmedBooking.status === 'reserved'
                        ? `Tu mesa ha sido asignada. ¡Te esperamos en ${business.name}!`
                        : 'El negocio revisará tu solicitud y te contactará pronto para confirmar.'}
                    </p>
                  </div>

                  {/* Información del cliente */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Información del Cliente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nombre:</span>
                        <span className="font-medium">
                          {confirmedBooking.client_name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Teléfono:</span>
                        <span className="font-medium">
                          {confirmedBooking.client_phone}
                        </span>
                      </div>
                      {confirmedBooking.client_email && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium text-xs">
                            {confirmedBooking.client_email}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Detalles de la reserva */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        Detalles de la Reserva
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-start justify-between">
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="font-medium text-right">
                          {formatForDisplay(
                            confirmedBooking.booking_date,
                            "EEEE, d 'de' MMMM 'de' yyyy",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Hora:</span>
                        <span className="font-medium">
                          {confirmedBooking.start_time} -{' '}
                          {confirmedBooking.end_time}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Personas:</span>
                        <span className="font-medium">
                          {confirmedBooking.party_size}
                        </span>
                      </div>
                      {confirmedBooking.room_id &&
                        rooms.find((r) => r.id === confirmedBooking.room_id) && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sala:</span>
                            <span className="font-medium">
                              {
                                rooms.find(
                                  (r) => r.id === confirmedBooking.room_id,
                                )?.name
                              }
                            </span>
                          </div>
                        )}
                      {confirmedBooking.notes && (
                        <div className="pt-2 border-t">
                          <span className="text-muted-foreground block mb-1">
                            Notas:
                          </span>
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
        {/* Botón Volver - FUERA del banner (SIN CAMBIOS) */}
        <div className="border-b border-border bg-background">
          <div className="container mx-auto px-4 py-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="hover-scale">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver
              </Button>
            </Link>
          </div>
        </div>

        {/* Banner del negocio - (SIN CAMBIOS) */}
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
                <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-2">
F                 {business.name}
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground font-medium">
                  {business.category}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contenido principal - 3 columnas (SIN CAMBIOS) */}
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
                    <p className="text-muted-foreground leading-relaxed">
                      {business.description}
                    </p>
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
                        style={{
                          border: 0,
                        }}
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD3G8p1Ca5ZxGiQfdDcKRZZwQI0TL40oVk&q=${encodeURIComponent(
                          business.address,
                G       )}`}
                        allowFullScreen
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full hover-scale"
                      onClick={openInGoogleMaps}
                    >
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
Â                           <span className="font-medium">{business.phone}</span>
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

            {/* Columna 3: Haz tu reserva (MODIFICADO) */}
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
                      <p className="text-sm text-foreground font-medium">
                        {business.booking_additional_message}
                      </p>
                    </div>
                  )}

                  {!user && (
                    <div className="mb-4 p-4 bg-yellow-500/10 border-l-4 border-yellow-500 rounded-md">
                      <p className="text-sm text-foreground font-medium">
                        Debes{' '}
                        <Link to="/auth" className="underline font-bold">
                          iniciar sesión
                        </Link>{' '}
                        para hacer una reserva
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleBookingSubmit} className="space-y-4">
                    <div>
                      <Label>Nombre *</Label>
                      <Input
                        value={bookingForm.clientName}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            clientName: e.target.value,
                          })
                        }
                        disabled={!user}
                      />
                    </div>

                    <div>
                      <Label>Teléfono *</Label>
                      <PhoneInput
                        defaultCountry="es"
                        value={bookingForm.clientPhone}
                        onChange={(phone) => {
                          setBookingForm({
                            ...bookingForm,
                            clientPhone: phone,
                          });
                          if (phone) {
                            validatePhone(phone);
                          } else {
                            setPhoneError('');
x                       }
                      }}
                        inputClassName={phoneError ? '!border-destructive' : ''}
                        className="phone-input-custom px-0 text-base mx-0"
                        disabled={!user}
                      />
                      {phoneError && (
                        <p className="text-sm text-destructive mt-1">
                          {phoneError}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Número de personas *</Label>
                      <Select
                        value={bookingForm.partySize}
                        onValueChange={handlePartySizeChange}
                        disabled={!user}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            {
                              length: maxTableCapacity,
                            },
                            (_, i) => i + 1,
                          ).map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} {n === 1 ? 'persona' : 'personas'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Selector de sala */}
                    {rooms.length > 0 && (
                      <div>
                        <Label>Elegir sala</Label>
                        <Select
                          value={bookingForm.roomId || 'all-rooms'}
                          onValueChange={handleRoomChange}
                          disabled={!user}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las salas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-rooms">Todas las salas</SelectItem>
                            {rooms.map((room) => (
                              <SelectItem key={room.id} value={room.id}>
s                             {room.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* DatePicker (MODIFICADO) */}
                    <div>
                      <Label>Fecha *</Label>
                      <DatePicker
                        date={bookingForm.bookingDate}
                        onDateChange={handleDateChange}
                        placeholder="Seleccionar fecha"
                        disabled={
                          !user || isDateLoading
a                         ? (d) => true
                            : handleDateDisabled
          S             }
                      />
                    </div>

                    {/* Select de Hora (MODIFICADO) */}
                    <div>
                      <Label>Hora *</Label>
                      <Select
                        value={bookingForm.startTime ?? undefined}
                        onValueChange={(v) =>
                          setBookingForm({ ...bookingForm, startTime: v })
                        }
                        disabled={
                          !user ||
                          !bookingForm.bookingDate ||
                          availabilityLoading
                        }
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !bookingForm.bookingDate
                                ? 'Selecciona una fecha primero'
                                : availabilityLoading
                                  ? 'Buscando horarios...'
content                         : finalAvailableSlots.length === 0
                                    ? 'No hay horarios disponibles'
                                    : 'Seleccionar hora'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availabilityLoading ? (
                            <SelectItem disabled value="loading">
                      t       Cargando...
                            </SelectItem>
                          ) : finalAvailableSlots.length > 0 ? (
                            finalAvailableSlots.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))
                s       ) : (
                            <SelectItem disabled value="no-slots">
                              No hay horarios disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

            D       <div>
                      <Label>Notas adicionales</Label>
                      <Textarea
                        value={bookingForm.notes}
                        onChange={(e) =>
                          setBookingForm({
                            ...bookingForm,
                            notes: e.target.value,
s                       })
                        }
                        disabled={!user}
E                     />
                    </div>

                    {/* Botón de Submit (MODIFICADO) */}
                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover-scale"
                      disabled={
                        !user ||
                        submitting ||
              g         availabilityLoading ||
                        !bookingForm.bookingDate ||
                        !bookingForm.startTime ||
                        !!phoneError ||
                        !bookingForm.clientPhone
                      }
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {submitting
                        ? 'Enviando...'
s                     : availabilityLoading
                          ? 'Cargando...'
                          : 'Confirmar reserva'}
                    </Button>
                  </form>

Do             {/* Botones de contacto (SIN CAMBIOS) */}
                  {(business.phone || business.email) && (
                    <div className="mt-6 pt-4 border-t border-border">
                    D <p className="text-sm text-muted-foreground mb-3 text-center">
                        ¿Prefieres contactarnos directamente?
                      </p>
                      <div className="flex gap-3">
                        {business.phone && (
                          <a href={`tel:${business.phone}`} className="flex-1">
                            <Button
                D             variant="outline"
                              size="sm"
                              className="w-full hover-scale"
Ind                         <Phone className="mr-2 h-4 w-4" />
                                Llámanos
                            </Button>
                          </a>
                        )}
                        {business.email && (
Dos                       <a href={`mailto:${business.email}`} className="flex-1">
                            <Button
                              variant="outline"
Norw                           size="sm"
                              className="w-full hover-scale"
                            >
                    Note     <Mail className="mr-2 h-4 w-4" />
                                Escríbenos
                            </Button>
                          </a>
                  Pos     )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
Note   </div>
    </>
  );
}