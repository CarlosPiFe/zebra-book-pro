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
      const endTime = endHour * 60 + endMinute;

      // Handle cases where end time is past midnight (e.g., 00:00)
      const actualEndTime = endTime === 0 ? 24 * 60 : endTime;

      while (currentTime < actualEndTime) {
        const hour = Math.floor(currentTime / 60);
        const minute = currentTime % 60;
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        allTimeSlots.push(timeStr);
        currentTime += slotDuration;
      }
    });

    // Filter out slots that don't have available tables
    const availableSlots = allTimeSlots.filter(timeSlot => {
      return hasAvailableTables(dateStr, timeSlot, partySize);
    });

    return availableSlots.sort();
  };

  // Check if there are available tables for a time slot
  const hasAvailableTables = (date: string, startTime: string, partySize: number): boolean => {
    // Find tables that can accommodate party size
    const suitableTables = tables.filter(table => table.max_capacity >= partySize);
    
    if (suitableTables.length === 0) return false;

    // Calculate end time based on slot duration
    const [hour, minute] = startTime.split(':').map(Number);
    const endMinutes = hour * 60 + minute + slotDuration;
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

    // Check if any suitable table is available
    return suitableTables.some(table => {
      // Check if this table is booked during this time
      const isBooked = bookings.some(booking => {
        if (booking.booking_date !== date) return false;
        if (booking.table_id !== table.id) return false;

        // Check for time overlap
        return !(booking.end_time <= startTime || booking.start_time >= endTime);
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
  };
}
