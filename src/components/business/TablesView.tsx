import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2, Edit, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrdersDialog } from "./OrdersDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
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
  const [loading, setLoading] = useState(true);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isOrdersDialogOpen, setIsOrdersDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  
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
    loadTables();
  }, [businessId, filterDate, filterTime]);

  const loadTables = async () => {
    try {
      const selectedDate = filterDate.toISOString().split('T')[0];
      
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
        .eq("booking_date", selectedDate)
        .lte("start_time", filterTime)
        .gt("end_time", filterTime)
        .in("status", ["reserved", "occupied"]);

      if (bookingsError) throw bookingsError;

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
          .in("table_id", occupiedTableIds)
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

      setTables(tablesWithBookings);
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Error al cargar las mesas");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTable = async () => {
    if (!tableNumber || !maxCapacity) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    try {
      const { error } = await supabase.from("tables").insert({
        business_id: businessId,
        table_number: parseInt(tableNumber),
        max_capacity: parseInt(maxCapacity),
      });

      if (error) throw error;

      toast.success("Mesa añadida correctamente");
      setIsAddTableDialogOpen(false);
      setTableNumber("");
      setMaxCapacity("");
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

  const handleDeleteTable = async (tableId: string) => {
    try {
      const { error } = await supabase.from("tables").delete().eq("id", tableId);

      if (error) throw error;

      toast.success("Mesa eliminada correctamente");
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

      const { error } = await supabase.from("bookings").insert({
        table_id: selectedTable.id,
        business_id: businessId,
        booking_date: today,
        start_time: startTime,
        end_time: endTime,
        client_name: "Cliente sin reserva",
        status: "occupied",
      });

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

  const handleReserveClick = () => {
    if (!selectedTable) return;
    
    const today = new Date().toISOString().split('T')[0];
    setBookingDate(today);
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
          .insert(bookingData);

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
      
      return "bg-orange-500/20 border-orange-500"; // Naranja - reservada (futura)
    }
    
    return "bg-muted";
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando mesas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-background min-h-screen">
      <h1 className="text-xl font-semibold">Gestión de Mesas</h1>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecciona fecha y hora para ver el estado de las mesas en ese momento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <DatePicker
                date={filterDate}
                onDateChange={(date) => date && setFilterDate(date)}
                placeholder="Seleccionar fecha"
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <TimePicker
                time={filterTime}
                onTimeChange={setFilterTime}
                placeholder="Seleccionar hora"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {tables.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Dialog open={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-muted-foreground/25 rounded-lg hover:border-muted-foreground/50 transition-colors bg-card">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground" />
                </div>
                <span className="text-lg font-medium text-muted-foreground">Añadir Mesa</span>
              </button>
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
                  <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                  <Input
                    id="max-capacity"
                    type="number"
                    placeholder="Ej: 4"
                    value={maxCapacity}
                    onChange={(e) => setMaxCapacity(e.target.value)}
                  />
                </div>
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
      ) : (
        <>
          <div className="flex justify-end">
            <Dialog open={isAddTableDialogOpen} onOpenChange={setIsAddTableDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
                    <Label htmlFor="max-capacity">Capacidad Máxima</Label>
                    <Input
                      id="max-capacity"
                      type="number"
                      placeholder="Ej: 4"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                    />
                  </div>
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

          <div className={`grid gap-2 ${tables.length >= 8 ? 'grid-cols-[repeat(auto-fit,minmax(80px,1fr))]' : 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8'}`}>
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative aspect-square border-2 rounded-lg p-1.5 flex flex-col items-center justify-center gap-0.5 hover:shadow-md transition-all group ${getTableColor(table)}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                  className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
                <div className="text-lg font-bold text-foreground">
                  {table.table_number}
                </div>
                <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{table.max_capacity}</span>
                </div>
                {table.current_booking && (
                  <>
                    <div className="text-[9px] text-muted-foreground truncate w-full text-center px-0.5">
                      {table.current_booking.client_name}
                    </div>
                    {table.current_booking.status === "occupied" && table.total_spent! > 0 && (
                      <div className="text-[10px] font-bold text-primary">
                        ${table.total_spent!.toFixed(2)}
                      </div>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>

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
                        <p><strong>Hora:</strong> {selectedTable.current_booking.start_time}</p>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      className="h-12"
                      onClick={handleCancelReservation}
                    >
                      Cancelar Reserva
                    </Button>
                    <Button
                      className="bg-orange-500 hover:bg-orange-600 text-white h-12"
                      onClick={handleEditReservation}
                    >
                      Cambiar Reserva
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
                      <SelectItem value="reserved">Reservada</SelectItem>
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
                    onClick={handleDeleteBooking}
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
        </>
      )}
    </div>
  );
}
