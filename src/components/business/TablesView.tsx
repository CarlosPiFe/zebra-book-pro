import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
  current_booking?: Booking | null;
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
}

interface TablesViewProps {
  businessId: string;
}

export function TablesView({ businessId }: TablesViewProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddTableDialogOpen, setIsAddTableDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  
  // Booking form state
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingStatus, setBookingStatus] = useState("reserved");

  useEffect(() => {
    loadTables();
  }, [businessId]);

  const loadTables = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get tables
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId)
        .order("table_number", { ascending: true });

      if (tablesError) throw tablesError;

      // Get today's active bookings for these tables
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", today)
        .in("status", ["reserved", "occupied"]);

      if (bookingsError) throw bookingsError;

      // Merge tables with their current bookings
      const tablesWithBookings = (tablesData || []).map(table => ({
        ...table,
        current_booking: bookingsData?.find(b => b.table_id === table.id) || null
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
    
    if (table.current_booking) {
      // Edit existing booking
      const booking = table.current_booking;
      setBookingDate(booking.booking_date);
      setStartTime(booking.start_time);
      setEndTime(booking.end_time);
      setClientName(booking.client_name || "");
      setClientPhone(booking.client_phone || "");
      setClientEmail(booking.client_email || "");
      setNotes(booking.notes || "");
      setBookingStatus(booking.status);
    } else {
      // New booking - set defaults
      const today = new Date().toISOString().split('T')[0];
      setBookingDate(today);
      setStartTime("");
      setEndTime("");
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      setNotes("");
      setBookingStatus("reserved");
    }
    
    setIsBookingDialogOpen(true);
  };

  const handleSaveBooking = async () => {
    if (!selectedTable || !bookingDate || !startTime || !endTime || !clientName) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      const bookingData = {
        table_id: selectedTable.id,
        business_id: businessId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        client_name: clientName,
        client_phone: clientPhone || null,
        client_email: clientEmail || null,
        notes: notes || null,
        status: bookingStatus,
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

  const getTableColor = (table: Table) => {
    if (!table.current_booking) return "bg-muted"; // Gris - disponible
    if (table.current_booking.status === "occupied") return "bg-green-500/20 border-green-500"; // Verde - comiendo
    if (table.current_booking.status === "reserved") return "bg-orange-500/20 border-orange-500"; // Naranja - reservada
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

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => handleTableClick(table)}
                className={`relative aspect-square border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all group ${getTableColor(table)}`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTable(table.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
                <div className="text-3xl font-bold text-foreground">
                  {table.table_number}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{table.max_capacity}</span>
                </div>
                {table.current_booking && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {table.current_booking.client_name}
                  </div>
                )}
              </button>
            ))}
          </div>

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
                  <Label htmlFor="client-phone">Teléfono</Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="Ej: 612345678"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
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
        </>
      )}
    </div>
  );
}
