import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2, Edit, Receipt, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrdersDialog } from "./OrdersDialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { addMinutes } from "date-fns";
import { getTimeSlotId } from "@/lib/timeSlots";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Room {
  id: string;
  name: string;
  is_active: boolean;
}

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
  min_capacity: number;
  room_id?: string | null;
  current_booking?: Booking | null;
  total_spent?: number;
  is_out_of_service?: boolean;
}

interface Booking {
  id: string;
  table_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  notes: string | null;
  party_size: number | null;
}

interface TablesViewProps {
  businessId: string;
}

export function TablesView({ businessId }: TablesViewProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [minCapacity, setMinCapacity] = useState("");
  const [selectedRoomForTable, setSelectedRoomForTable] = useState<string>("");
  const [orders, setOrders] = useState<any[]>([]);
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null);
  const [deleteBookingDialogOpen, setDeleteBookingDialogOpen] = useState(false);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [newRoomIdForTable, setNewRoomIdForTable] = useState<string>("");
  const [newMinCapacity, setNewMinCapacity] = useState<string>("");
  const [newMaxCapacity, setNewMaxCapacity] = useState<string>("");
  
  // Filter states
  const [filterDate, setFilterDate] = useState<Date>(new Date());
  const [filterTime, setFilterTime] = useState<string>(
    new Date().toTimeString().slice(0, 5)
  );
  
  // Booking form state
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingStatus, setBookingStatus] = useState("reserved");
  const [partySize, setPartySize] = useState("");

  useEffect(() => {
    loadRooms();
    loadTables();

    // Subscribe to realtime changes in bookings table
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `business_id=eq.${businessId}`
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          loadTables(); // Reload tables when any booking changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, filterDate, filterTime]);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("business_rooms")
        .select("id, name, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Error loading rooms:", error);
    }
  };

  // Auto-calculate end time when start time changes
  useEffect(() => {
    if (startTime && businessId) {
      const [hours = 0, minutes = 0] = startTime.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        const startDate = new Date();
        startDate.setHours(hours, minutes, 0, 0);
        
        // Load slot duration and calculate end time
        const loadSlotDuration = async () => {
          const { data } = await supabase
            .from("businesses")
            .select("booking_slot_duration_minutes")
            .eq("id", businessId)
            .single();
          
          if (data) {
            const endDate = addMinutes(startDate, data.booking_slot_duration_minutes);
            const calculatedEndTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
            setEndTime(calculatedEndTime);
          }
        };
        
        loadSlotDuration();
      }
    }
  }, [startTime, businessId]);

  const loadTables = async () => {
    try {
      // Usar formato de fecha local sin conversión UTC
      const year = filterDate.getFullYear();
      const month = String(filterDate.getMonth() + 1).padStart(2, '0');
      const day = String(filterDate.getDate()).padStart(2, '0');
      const selectedDate = `${year}-${month}-${day}`;
      
      console.log('Loading tables for date:', selectedDate, 'time:', filterTime);
      
      // Get tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      // Get bookings for selected date and time
      // Using > (not >=) so end time is exclusive - table is free exactly at end_time
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("business_id", businessId)
        .eq("booking_date", selectedDate)
        .lte("start_time", filterTime)
        .gt("end_time", filterTime)
        .in("status", ["reserved", "occupied"]);

      if (bookingsError) throw bookingsError;

      console.log('Bookings found:', bookingsData?.length || 0);

      // Get orders for today's occupied tables
      const occupiedTableIds = bookingsData
        ?.filter(b => b.status === "occupied")
        .map(b => b.table_id) || [];

      let ordersData: any[] = [];
      if (occupiedTableIds.length > 0) {
        const { data, error: ordersError } = await supabase
          .from("orders")
          .select(`
            *,
            menu_items!inner(price)
          `)
          .in("table_id", occupiedTableIds.filter((id): id is string => id !== null))
          .eq("status", "pending");

        if (ordersError) throw ordersError;
        ordersData = data || [];
      }

      // Calculate total spent per table
      const tableTotals = ordersData.reduce((acc, order) => {
        const tableId = order.table_id;
        const amount = order.menu_items.price * order.quantity;
        acc[tableId] = (acc[tableId] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      // Merge tables with their current bookings and totals
      const tablesWithBookings = (tablesData || []).map(table => ({
        ...table,
        current_booking: bookingsData?.find(b => b.table_id === table.id) || null,
        total_spent: tableTotals[table.id] || 0
      }));

      setTables(tablesWithBookings as any);
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Error al cargar las mesas");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableNumber || !maxCapacity || !minCapacity) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const minCap = parseInt(minCapacity);
    const maxCap = parseInt(maxCapacity);

    if (minCap > maxCap) {
      toast.error("El mínimo de personas no puede ser mayor que el máximo");
      return;
    }

    if (minCap < 1) {
      toast.error("El mínimo de personas debe ser al menos 1");
      return;
    }

    try {
      const { error } = await supabase.from("tables").insert({
        business_id: businessId,
        table_number: parseInt(tableNumber),
        max_capacity: maxCap,
        min_capacity: minCap,
        room_id: selectedRoomForTable || null,
      });

      if (error) throw error;

      toast.success("Mesa añadida correctamente");
      setIsAddTableDialogOpen(false);
      setTableNumber("");
      setMaxCapacity("");
      setMinCapacity("");
      setSelectedRoomForTable("");
      loadTables();
    } catch (error: any) {
      console.error("Error adding table:", error);
      if (error.code === "23505") {
        toast.error("Ya existe una mesa con ese número");
      } else {
        toast.error("Error al añadir la mesa");
      }
    }
  };

  const handleDeleteTable = async () => {
    if (!deleteTableId) return;

    try {
      const { error } = await supabase.from("tables").delete().eq("id", deleteTableId);

      if (error) throw error;

      toast.success("Mesa eliminada correctamente");
      setDeleteTableId(null);
      loadTables();
    } catch (error) {
      console.error("Error deleting table:", error);
      toast.error("Error al eliminar la mesa");
    }
  };

  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setIsActionDialogOpen(true);
  };

  const handleViewOrders = async () => {
    if (!selectedTable) return;
    
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          menu_items(name, price)
        `)
        .eq("table_id", selectedTable.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;

      setOrders(data || []);
      setIsActionDialogOpen(false);
      setIsOrdersDialogOpen(true);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Error al cargar pedidos");
    }
  };

  const handleQuickOccupy = async () => {
    if (!selectedTable) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();
      const startTime = now.toTimeString().slice(0, 5);
      const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toTimeString().slice(0, 5);

      // Obtener time_slot_id
      const timeSlotId = await getTimeSlotId(startTime);
      if (!timeSlotId) {
        toast.error("No se pudo obtener la franja horaria");
        return;
      }

      const fallbackDate = new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10);
      const bookingDate: string = today || fallbackDate;
      
      const { error } = await supabase.from("bookings").insert([{
        table_id: selectedTable.id,
        business_id: businessId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        client_name: "Cliente sin reserva",
        status: "occupied",
        time_slot_id: timeSlotId,
      }]);

      if (error) throw error;

      toast.success("Mesa ocupada");
      setIsActionDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error occupying table:", error);
      toast.error("Error al ocupar la mesa");
    }
  };

  const handleCompleteOccupancy = async () => {
    if (!selectedTable?.current_booking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "completed" })
        .eq("id", selectedTable.current_booking.id);

      if (error) throw error;

      toast.success("Mesa liberada");
      loadTables();
      setIsActionDialogOpen(false);
    } catch (error) {
      console.error("Error completing occupancy:", error);
      toast.error("Error al liberar la mesa");
    }
  };

  const handleClientLeft = async () => {
    if (!selectedTable?.current_booking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", selectedTable.current_booking.id);

      if (error) throw error;

      toast.success("Cliente marcado como ausente");
      loadTables();
      setIsActionDialogOpen(false);
    } catch (error) {
      console.error("Error marking client as left:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const handleConfirmArrival = async () => {
    if (!selectedTable?.current_booking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "occupied" })
        .eq("id", selectedTable.current_booking.id);

      if (error) throw error;

      toast.success("Cliente confirmado - mesa ocupada");
      setIsActionDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error confirming arrival:", error);
      toast.error("Error al confirmar la llegada");
    }
  };

  const handleReserveClick = () => {
    if (!selectedTable) return;
    
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today || "");
    setStartTime("");
    setEndTime("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setNotes("");
    setBookingStatus("reserved");
    setPartySize("");
    setIsActionDialogOpen(false);
    setIsBookingDialogOpen(true);
  };

  const handleEditReservation = () => {
    if (!selectedTable || !selectedTable.current_booking) return;
    
    const booking = selectedTable.current_booking;
    setBookingDate(booking.booking_date);
    setStartTime(booking.start_time);
    setEndTime(booking.end_time);
    setClientName(booking.client_name || "");
    setClientPhone(booking.client_phone || "");
    setClientEmail(booking.client_email || "");
    setNotes(booking.notes || "");
    setBookingStatus(booking.status);
    setPartySize(booking.party_size?.toString() || "");
    setIsActionDialogOpen(false);
    setIsBookingDialogOpen(true);
  };

  const handleSaveBooking = async () => {
    if (!selectedTable || !clientName || !clientPhone || !partySize) {
      toast.error("Por favor completa nombre, teléfono y cantidad de comensales");
      return;
    }

    try {
      // Obtener time_slot_id
      const timeSlotId = await getTimeSlotId(startTime || "00:00");
      if (!timeSlotId) {
        toast.error("No se pudo obtener la franja horaria");
        return;
      }

      const bookingData = {
        table_id: selectedTable.id,
        business_id: businessId,
        booking_date: bookingDate || new Date().toISOString().split('T')[0],
        start_time: startTime || "00:00",
        end_time: endTime || "23:59",
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null,
        notes: notes || null,
        status: bookingStatus,
        party_size: parseInt(partySize),
        time_slot_id: timeSlotId,
      };

      if (selectedTable.current_booking) {
        // Update existing booking
        const { error } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", selectedTable.current_booking.id);

        if (error) throw error;
        toast.success("Reserva actualizada correctamente");
      } else {
        // Create new booking
        const { error } = await supabase
          .from("bookings")
          .insert([bookingData] as any);

        if (error) throw error;
        toast.success("Reserva creada correctamente");
      }

      setIsBookingDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error("Error al guardar la reserva");
    }
  };

  const handleCancelReservation = async () => {
    if (!selectedTable?.current_booking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", selectedTable.current_booking.id);

      if (error) throw error;

      toast.success("Reserva cancelada correctamente");
      setDeleteBookingDialogOpen(false);
      setIsActionDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error canceling reservation:", error);
      toast.error("Error al cancelar la reserva");
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedTable?.current_booking) return;

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", selectedTable.current_booking.id);

      if (error) throw error;

      toast.success("Reserva eliminada correctamente");
      setDeleteBookingDialogOpen(false);
      setIsBookingDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast.error("Error al eliminar la reserva");
    }
  };

  const handleToggleOutOfService = async () => {
    if (!selectedTable) return;

    try {
      const newStatus = !selectedTable.is_out_of_service;
      
      const { error } = await supabase
        .from("tables")
        .update({ is_out_of_service: newStatus } as any)
        .eq("id", selectedTable.id);

      if (error) throw error;

      toast.success(newStatus ? "Mesa marcada fuera de servicio" : "Mesa reactivada");
      setIsActionDialogOpen(false);
      loadTables();
    } catch (error) {
      console.error("Error toggling out of service:", error);
      toast.error("Error al actualizar el estado de la mesa");
    }
  };

  const handleOpenConfigDialog = () => {
    if (!selectedTable) return;
    setNewRoomIdForTable(selectedTable.room_id || "");
    setNewMinCapacity(selectedTable.min_capacity?.toString() || "1");
    setNewMaxCapacity(selectedTable.max_capacity?.toString() || "");
    setIsActionDialogOpen(false);
    setIsConfigDialogOpen(true);
  };

  const handleSaveTableConfig = async () => {
    if (!selectedTable) return;

    const minCap = parseInt(newMinCapacity);
    const maxCap = parseInt(newMaxCapacity);

    if (isNaN(minCap) || isNaN(maxCap)) {
      toast.error("Por favor ingresa valores válidos para las capacidades");
      return;
    }

    if (minCap > maxCap) {
      toast.error("La capacidad mínima no puede ser mayor que la máxima");
      return;
    }

    if (minCap < 1) {
      toast.error("La capacidad mínima debe ser al menos 1");
      return;
    }

    try {
      const { error } = await supabase
        .from("tables")
        .update({ 
          room_id: newRoomIdForTable || null,
          min_capacity: minCap,
          max_capacity: maxCap
        } as any)
        .eq("id", selectedTable.id);

      if (error) throw error;

      toast.success("Configuración de la mesa actualizada correctamente");
      setIsConfigDialogOpen(false);
      setNewRoomIdForTable("");
      setNewMinCapacity("");
      setNewMaxCapacity("");
      loadTables();
    } catch (error) {
      console.error("Error updating table config:", error);
      toast.error("Error al actualizar la configuración de la mesa");
    }
  };

  const getTableColor = (table: Table) => {
    // Rojo - fuera de servicio (prioridad máxima)
    if (table.is_out_of_service) {
      return "bg-red-500/20 border-red-500";
    }
    
    if (!table.current_booking) return "bg-muted"; // Gris - disponible
    
    const booking = table.current_booking;
    
    if (booking.status === "occupied") {
      return "bg-green-500/20 border-green-500"; // Verde - comiendo
    }
    
    if (booking.status === "reserved") {
      // Calcular si la reserva está retrasada (más de 5 minutos)
      const now = new Date();
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const delayThreshold = new Date(bookingDateTime.getTime() + 5 * 60 * 1000); // +5 minutos
      
      if (now >= delayThreshold) {
        return "bg-yellow-500/20 border-yellow-500"; // Amarillo - reserva retrasada
      }
      
      return "bg-orange-500/20 border-orange-500"; // Naranja - pendiente (futura)
    }
    
    return "bg-muted";
  };

  const getTableStatusLabel = (table: Table): string | null => {
    // Rojo - fuera de servicio (prioridad máxima)
    if (table.is_out_of_service) {
      return "Fuera de servicio";
    }
    
    if (!table.current_booking) return null; // Sin etiqueta para mesas libres
    
    const booking = table.current_booking;
    
    if (booking.status === "occupied") {
      return "En curso";
    }
    
    if (booking.status === "reserved") {
      // Calcular si la reserva está retrasada (más de 5 minutos)
      const now = new Date();
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const delayThreshold = new Date(bookingDateTime.getTime() + 5 * 60 * 1000); // +5 minutos
      
      if (now >= delayThreshold) {
        return "Retraso";
      }
      
      return "Pendiente";
    }
    
    return null;
  };

  const getTableStatusLabelColor = (table: Table): string => {
    // Rojo oscuro - fuera de servicio
    if (table.is_out_of_service) {
      return "text-red-800";
    }
    
    if (!table.current_booking) return "";
    
    const booking = table.current_booking;
    
    if (booking.status === "occupied") {
      return "text-green-800"; // Verde oscuro
    }
    
    if (booking.status === "reserved") {
      // Calcular si la reserva está retrasada (más de 5 minutos)
      const now = new Date();
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
      const delayThreshold = new Date(bookingDateTime.getTime() + 5 * 60 * 1000);
      
      if (now >= delayThreshold) {
        return "text-yellow-800"; // Amarillo oscuro
      }
      
      return "text-orange-800"; // Naranja oscuro
    }
    
    return "";
  };

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  // Filtrar mesas según la sala seleccionada
  const filteredTables = selectedRoomId
    ? tables.filter(t => t.room_id === selectedRoomId)
    : tables;

  // Agrupar mesas por sala para vista "Todos"
  const tablesByRoom = tables.reduce((acc, table) => {
    const roomId = table.room_id || "sin-sala";
    if (!acc[roomId]) acc[roomId] = [];
    acc[roomId].push(table);
    return acc;
  }, {} as Record<string, Table[]>);

  return (
    <div className="space-y-4 bg-background min-h-screen">
      {/* Header con título, botón filtros y botón añadir mesa */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Gestión de Mesas</h1>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-4" align="start">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Filtros</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <DatePicker
                      date={filterDate}
                      onDateChange={(date) => date && setFilterDate(date)}
                      placeholder="Seleccionar fecha"
                      onPreviousDay={() => {
                        const newDate = new Date(filterDate);
                        newDate.setDate(newDate.getDate() - 1);
                        setFilterDate(newDate);
                      }}
                      onNextDay={() => {
                        const newDate = new Date(filterDate);
                        newDate.setDate(newDate.getDate() + 1);
                        setFilterDate(newDate);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora (opcional)</Label>
                    <TimePicker
                      time={filterTime}
                      onTimeChange={setFilterTime}
                      placeholder="Ver todas las horas"
                      allowClear={true}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <Dialog open={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen}>
          <DialogTrigger asChild>
            <Button className="mr-6">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nueva Mesa</DialogTitle>
              <DialogDescription>
                Completa la información de la mesa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="table-number">Número de Mesa</Label>
                <Input
                  id="table-number"
                  type="number"
                  placeholder="Ej: 1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min-capacity">Capacidad Mínima</Label>
                <Input
                  id="min-capacity"
                  type="number"
                  placeholder="Ej: 1"
                  value={minCapacity}
                  onChange={(e) => setMinCapacity(e.target.value)}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Número mínimo de personas que pueden usar esta mesa
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                <Input
                  id="max-capacity"
                  type="number"
                  placeholder="Ej: 4"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  min="1"
                />
                <p className="text-xs text-muted-foreground">
                  Número máximo de personas que pueden usar esta mesa
                </p>
              </div>
              {rooms.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="room">Sala (opcional)</Label>
                  <Select value={selectedRoomForTable || "no-room"} onValueChange={(value) => setSelectedRoomForTable(value === "no-room" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sala" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-room">Sin sala específica</SelectItem>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTableDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddTable}>Añadir Mesa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Selector de salas (siempre visible) */}
      {rooms.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedRoomId === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedRoomId(null)}
          >
            Todas las salas
          </Button>
          {rooms.map((room) => (
            <Button
              key={room.id}
              variant={selectedRoomId === room.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRoomId(room.id)}
            >
              {room.name}
            </Button>
          ))}
        </div>
      )}

      {/* Grid de mesas */}
      {tables.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">No hay mesas creadas</p>
            <p className="text-sm text-muted-foreground">Haz clic en "Añadir Mesa" para crear una</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mostrar mesas filtradas por sala seleccionada */}
          {selectedRoomId ? (
            <div className="grid gap-3 grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
              {filteredTables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative aspect-square border-2 rounded-lg p-2 flex flex-col items-center justify-between hover:shadow-md transition-all group ${getTableColor(table)}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTableId(table.id);
                  }}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
                
                {/* Estado - parte superior sin recuadro */}
                {getTableStatusLabel(table) && (
                  <div className={`text-[9px] font-bold ${getTableStatusLabelColor(table)} w-full text-center`}>
                    {getTableStatusLabel(table)}
                  </div>
                )}
                
                {/* Contenido central */}
                <div className="flex flex-col items-center gap-1 flex-1 justify-center">
                  {/* Número de mesa */}
                  <div className="text-lg font-bold text-foreground">
                    {table.table_number}
                  </div>
                  
                  {/* Capacidad */}
                  <div className="flex items-center gap-0.5 text-[10px] text-foreground/80 font-medium">
                    <Users className="h-3 w-3" />
                    <span>{table.min_capacity}-{table.max_capacity}</span>
                  </div>
                  
                  {/* Nombre del reservante */}
                  {table.current_booking && table.current_booking.client_name && (
                    <div className="text-[9px] font-semibold text-foreground/90 text-center truncate w-full px-1 mt-1">
                      {table.current_booking.client_name}
                    </div>
                  )}
                </div>
                
                {/* Total gastado - parte inferior */}
                {table.current_booking?.status === "occupied" && table.total_spent! > 0 && (
                  <div className="text-xs font-bold text-primary">
                    ${table.total_spent!.toFixed(2)}
                  </div>
                )}
              </button>
            ))}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(tablesByRoom).map(([roomId, roomTables]) => {
                const room = rooms.find(r => r.id === roomId);
                const roomName = room ? room.name : "Sin sala asignada";
                
                return (
                  <div key={roomId} className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">{roomName}</h3>
                    <div className="grid gap-3 grid-cols-4 md:grid-cols-6 lg:grid-cols-9">
                      {roomTables.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => handleTableClick(table)}
                          className={`relative aspect-square border-2 rounded-lg p-2 flex flex-col items-center justify-between hover:shadow-md transition-all group ${getTableColor(table)}`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTableId(table.id);
                            }}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                          
                          {getTableStatusLabel(table) && (
                            <div className={`text-[9px] font-bold ${getTableStatusLabelColor(table)} w-full text-center`}>
                              {getTableStatusLabel(table)}
                            </div>
                          )}
                          
                          <div className="flex flex-col items-center gap-1 flex-1 justify-center">
                            <div className="text-lg font-bold text-foreground">
                              {table.table_number}
                            </div>
                            <div className="flex items-center gap-0.5 text-[10px] text-foreground/80 font-medium">
                              <Users className="h-3 w-3" />
                              <span>{table.min_capacity}-{table.max_capacity}</span>
                            </div>
                            {table.current_booking && table.current_booking.client_name && (
                              <div className="text-[9px] font-semibold text-foreground/90 text-center truncate w-full px-1 mt-1">
                                {table.current_booking.client_name}
                              </div>
                            )}
                          </div>
                          
                          {table.current_booking?.status === "occupied" && table.total_spent! > 0 && (
                            <div className="text-xs font-bold text-primary">
                              ${table.total_spent!.toFixed(2)}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Dialog */}
          <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Mesa {selectedTable?.table_number}</DialogTitle>
                <DialogDescription>
                  Selecciona una acción para esta mesa
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                {selectedTable?.is_out_of_service ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-600 font-semibold">⚠️ Mesa fuera de servicio</p>
                      <p className="text-xs mt-1">Esta mesa está bloqueada y no acepta reservas</p>
                    </div>
                    <Button
                      onClick={handleToggleOutOfService}
                      className="bg-green-500 hover:bg-green-600 text-white h-12"
                    >
                      Reactivar Mesa
                    </Button>
                  </>
                ) : !selectedTable?.current_booking ? (
                  <>
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white h-12"
                      onClick={handleQuickOccupy}
                    >
                      Comer
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white h-12"
                      onClick={handleReserveClick}
                    >
                      Reservar
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={handleOpenConfigDialog}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Configuración
                    </Button>
                    <Button
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50 h-12"
                      onClick={handleToggleOutOfService}
                    >
                      Marcar Fuera de Servicio
                    </Button>
                  </>
                ) : selectedTable.current_booking.status === "reserved" ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      <p><strong>Cliente:</strong> {selectedTable.current_booking.client_name}</p>
                      {selectedTable.current_booking.client_phone && (
                        <p><strong>Teléfono:</strong> {selectedTable.current_booking.client_phone}</p>
                      )}
                      {selectedTable.current_booking.start_time && (
                        <p><strong>Hora:</strong> {selectedTable.current_booking.start_time.substring(0, 5)}</p>
                      )}
                      {selectedTable.current_booking.party_size && (
                        <p><strong>Comensales:</strong> {selectedTable.current_booking.party_size}</p>
                      )}
                    </div>
                    <Button
                      className="bg-green-500 hover:bg-green-600 text-white h-12"
                      onClick={handleConfirmArrival}
                    >
                      Cliente ha llegado / Está comiendo
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white h-12"
                      onClick={handleEditReservation}
                    >
                      Cambiar Reserva
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12"
                      onClick={handleOpenConfigDialog}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Configuración
                    </Button>
                    <Button
                     variant="destructive"
                     className="h-12"
                     onClick={() => setDeleteBookingDialogOpen(true)}
                   >
                     Cancelar Reserva
                   </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <p><strong>Cliente:</strong> {selectedTable.current_booking.client_name}</p>
                      {selectedTable.current_booking.client_phone && (
                        <p><strong>Teléfono:</strong> {selectedTable.current_booking.client_phone}</p>
                      )}
                      {selectedTable.current_booking.party_size && (
                        <p><strong>Comensales:</strong> {selectedTable.current_booking.party_size}</p>
                      )}
                      <p><strong>Estado:</strong> Comiendo</p>
                      {selectedTable.total_spent! > 0 && (
                        <p className="text-lg font-bold text-primary">
                          <strong>Total:</strong> ${selectedTable.total_spent!.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleViewOrders}
                        variant="outline"
                        className="w-full h-12"
                      >
                        <Receipt className="w-4 h-4 mr-2" />
                        Ver Pedido
                      </Button>
                      {rooms.length > 0 && (
                        <Button
                          variant="outline"
                          className="w-full h-12"
                          onClick={handleOpenConfigDialog}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Configuración
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleCompleteOccupancy}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-12"
                        >
                          Cliente ha terminado
                        </Button>
                        <Button
                          onClick={handleClientLeft}
                          variant="outline"
                          className="flex-1 h-12"
                        >
                          Cliente se ha ido
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Booking Dialog */}
          <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedTable?.current_booking ? "Editar Reserva" : "Nueva Reserva"} - Mesa {selectedTable?.table_number}
                </DialogTitle>
                <DialogDescription>
                  {selectedTable?.current_booking 
                    ? "Modifica los datos de la reserva o cambia el estado"
                    : "Completa los datos del cliente y la reserva"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="booking-date">Fecha</Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-time">Hora Inicio</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-time">Hora Fin</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-name">Nombre del Cliente *</Label>
                  <Input
                    id="client-name"
                    placeholder="Ej: Juan Pérez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-phone">Teléfono *</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="Ej: 612345678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="party-size">Cantidad de Comensales *</Label>
                  <Input
                    id="party-size"
                    type="number"
                    min="1"
                    placeholder="Ej: 4"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-email">Email</Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="Ej: cliente@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={bookingStatus} onValueChange={setBookingStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reserved">Pendiente</SelectItem>
                      <SelectItem value="occupied">Comiendo</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    placeholder="Alergias, preferencias, etc."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedTable?.current_booking && (
                  <Button 
                    variant="destructive" 
                    onClick={() => setDeleteBookingDialogOpen(true)}
                    className="w-full sm:w-auto"
                  >
                    Eliminar Reserva
                  </Button>
                )}
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsBookingDialogOpen(false)}
                    className="flex-1 sm:flex-none"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveBooking}
                    className="flex-1 sm:flex-none"
                  >
                    Guardar
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Orders Dialog */}
          <OrdersDialog
            open={isOrdersDialogOpen}
            onOpenChange={setIsOrdersDialogOpen}
            tableNumber={selectedTable?.table_number || 0}
            orders={orders}
            totalAmount={selectedTable?.total_spent || 0}
          />

          <AlertDialog open={deleteTableId !== null} onOpenChange={(open) => !open && setDeleteTableId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro que quieres eliminar esta mesa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La mesa será eliminada permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTable} className="bg-destructive hover:bg-destructive/90">
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={deleteBookingDialogOpen} onOpenChange={setDeleteBookingDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro que quieres eliminar esta reserva?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. La reserva será eliminada permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => {
                    if (isBookingDialogOpen) {
                      handleDeleteBooking();
                    } else {
                      handleCancelReservation();
                    }
                  }} 
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Table Configuration Dialog */}
          <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configuración - Mesa {selectedTable?.table_number}</DialogTitle>
                <DialogDescription>
                  Configura la sala y las capacidades de esta mesa
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {rooms.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="new-room">Sala</Label>
                    <Select value={newRoomIdForTable || "no-room"} onValueChange={(value) => setNewRoomIdForTable(value === "no-room" ? "" : value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar sala" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-room">Sin sala específica</SelectItem>
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-min-capacity">Capacidad Mínima</Label>
                  <Input
                    id="new-min-capacity"
                    type="number"
                    placeholder="Ej: 1"
                    value={newMinCapacity}
                    onChange={(e) => setNewMinCapacity(e.target.value)}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número mínimo de personas que pueden usar esta mesa
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-max-capacity">Capacidad Máxima</Label>
                  <Input
                    id="new-max-capacity"
                    type="number"
                    placeholder="Ej: 4"
                    value={newMaxCapacity}
                    onChange={(e) => setNewMaxCapacity(e.target.value)}
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Número máximo de personas que pueden usar esta mesa
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveTableConfig}>Guardar Cambios</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
