import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvailabilitySlot {
  id: string;
  business_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  table_id: string;
}

interface Table {
  id: string;
  table_number: number;
  max_capacity: number;
}

export function useBookingAvailability(businessId: string | undefined) {
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slotDuration, setSlotDuration] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const loadData = async () => {
      try {
        // Load availability slots
        const { data: slotsData, error: slotsError } = await supabase
          .from("availability_slots")
          .select("*")
          .eq("business_id", businessId);

        if (slotsError) throw slotsError;
        setAvailabilitySlots(slotsData || []);

        // Load tables
        const { data: tablesData, error: tablesError } = await supabase
          .from("tables")
          .select("*")
          .eq("business_id", businessId);

        if (tablesError) throw tablesError;
        setTables(tablesData || []);

        // Load bookings (for the next 30 days)
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const future = futureDate.toISOString().split('T')[0];

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", businessId)
          .gte("booking_date", today)
          .lte("booking_date", future)
          .neq("status", "cancelled");

        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);

        // Load business slot duration
        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("booking_slot_duration_minutes")
          .eq("id", businessId)
          .maybeSingle();

        if (businessError) throw businessError;
        if (businessData) {
          setSlotDuration(businessData.booking_slot_duration_minutes || 60);
        }
      } catch (error) {
        console.error("Error loading availability data:", error);
        toast.error("Error al cargar disponibilidad");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [businessId]);

  // Check if a date is available (business is open)
  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return availabilitySlots.some(slot => slot.day_of_week === dayOfWeek);
  };

  // Get available time slots for a specific date
  const getAvailableTimeSlots = (date: Date, partySize: number): string[] => {
    if (!date) return [];

    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Get slots for this day of week
    const daySlots = availabilitySlots.filter(slot => slot.day_of_week === dayOfWeek);
    if (daySlots.length === 0) return [];

    // Generate all possible time slots
    const allTimeSlots: string[] = [];
    
    daySlots.forEach(slot => {
      const [startHour, startMinute] = slot.start_time.split(':').map(Number);
      const [endHour, endMinute] = slot.end_time.split(':').map(Number);
      
      let currentTime = startHour * 60 + startMinute;
      let endTime = endHour * 60 + endMinute;

      // Detectar cruce de medianoche: si end_time < start_time, el horario cruza medianoche
      const crossesMidnight = endTime < currentTime;
      if (crossesMidnight) {
        // Añadir 24 horas (1440 minutos) al end_time para que la lógica funcione
        endTime += 24 * 60;
      }

      while (currentTime < endTime) {
        // Normalizar la hora para que esté en el rango 0-23
        const normalizedTime = currentTime % (24 * 60);
        const hour = Math.floor(normalizedTime / 60);
        const minute = normalizedTime % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        allTimeSlots.push(timeStr);
        currentTime += slotDuration;
      }
    });

    // Filter out slots that don't have available tables
    const availableSlots = allTimeSlots.filter(timeSlot => {
      return hasAvailableTables(dateStr, timeSlot, partySize);
    });

    return availableSlots.sort((a, b) => {
      // Ordenar considerando que las horas de madrugada vienen después de las nocturnas
      const [aHour] = a.split(':').map(Number);
      const [bHour] = b.split(':').map(Number);
      
      // Si hay horas de madrugada (0-6), ponerlas al final
      const aTime = aHour < 6 ? aHour + 24 : aHour;
      const bTime = bHour < 6 ? bHour + 24 : bHour;
      
      if (aTime !== bTime) return aTime - bTime;
      return a.localeCompare(b);
    });
  };

  // Check if there are available tables for a time slot
  const hasAvailableTables = (date: string, startTime: string, partySize: number): boolean => {
    // Find tables that can accommodate party size
    const suitableTables = tables.filter(table => table.max_capacity >= partySize);
    
    if (suitableTables.length === 0) return false;

    // Calculate end time based on slot duration
    const [hour, minute] = startTime.split(':').map(Number);
    let endMinutes = hour * 60 + minute + slotDuration;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // Check if any suitable table is available
    return suitableTables.some(table => {
      // Check if this table is booked during this time
      const isBooked = bookings.some(booking => {
        if (booking.booking_date !== date) return false;
        if (booking.table_id !== table.id) return false;

        // Convertir todas las horas a minutos para comparación correcta
        const [bookingStartHour, bookingStartMinute] = booking.start_time.split(':').map(Number);
        const [bookingEndHour, bookingEndMinute] = booking.end_time.split(':').map(Number);
        const [slotStartHour, slotStartMinute] = startTime.split(':').map(Number);
        const [slotEndHour, slotEndMinute] = endTime.split(':').map(Number);

        let bookingStartMinutes = bookingStartHour * 60 + bookingStartMinute;
        let bookingEndMinutes = bookingEndHour * 60 + bookingEndMinute;
        let slotStartMinutes = slotStartHour * 60 + slotStartMinute;
        let slotEndMinutes = slotEndHour * 60 + slotEndMinute;

        // Si las horas son de madrugada (0-6), considerarlas como del día siguiente
        if (bookingEndMinutes < bookingStartMinutes) bookingEndMinutes += 24 * 60;
        if (slotEndMinutes < slotStartMinutes) slotEndMinutes += 24 * 60;
        
        // Normalizar horas de madrugada en el slot
        if (slotStartHour < 6 && slotStartMinutes < 360) slotStartMinutes += 24 * 60;
        if (slotEndHour < 6 && slotEndMinutes < 360) slotEndMinutes += 24 * 60;
        
        // Normalizar horas de madrugada en la reserva
        if (bookingStartHour < 6 && bookingStartMinutes < 360) bookingStartMinutes += 24 * 60;
        if (bookingEndHour < 6 && bookingEndMinutes < 360) bookingEndMinutes += 24 * 60;

        // Check for time overlap
        return !(bookingEndMinutes <= slotStartMinutes || bookingStartMinutes >= slotEndMinutes);
      });

      return !isBooked;
    });
  };

  // Get next available time slot
  const getNextAvailableSlot = (date: Date, partySize: number): string | null => {
    const slots = getAvailableTimeSlots(date, partySize);
    return slots.length > 0 ? slots[0] : null;
  };

  return {
    isDateAvailable,
    getAvailableTimeSlots,
    hasAvailableTables,
    getNextAvailableSlot,
    loading,
    slotDuration,
    tables,
  };
}
