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
        const today = new Date().toISOString().split("T")[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const future = futureDate.toISOString().split("T")[0];

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", businessId)
          .gte("booking_date", today)
          .lte("booking_date", future)
          .neq("status", "cancelled")
          .neq("status", "completed");

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

    // Subscribe to real-time updates for bookings
    const bookingsChannel = supabase
      .channel("bookings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          // Reload bookings when changes occur
          loadData();
        },
      )
      .subscribe();

    // Subscribe to tables changes
    const tablesChannel = supabase
      .channel("tables-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(tablesChannel);
    };
  }, [businessId]);

  // Check if a date is available (business is open)
  const isDateAvailable = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return availabilitySlots.some((slot) => slot.day_of_week === dayOfWeek);
  };

  // Get all time slots for a specific date (regardless of availability)
  const getAllTimeSlots = (date: Date): string[] => {
    if (!date) return [];

    const dayOfWeek = date.getDay();

    // Get slots for this day of week
    const daySlots = availabilitySlots.filter((slot) => slot.day_of_week === dayOfWeek);
    if (daySlots.length === 0) return [];

    // Generate all possible time slots
    const allTimeSlots: string[] = [];

    daySlots.forEach((slot) => {
      const [startHour, startMinute] = slot.start_time.split(":").map(Number);
      const [endHour, endMinute] = slot.end_time.split(":").map(Number);

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
        const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        allTimeSlots.push(timeStr);
        currentTime += slotDuration;
      }
    });

    return allTimeSlots.sort((a, b) => {
      // Ordenar considerando que las horas de madrugada vienen después de las nocturnas
      const [aHour] = a.split(":").map(Number);
      const [bHour] = b.split(":").map(Number);

      // Si hay horas de madrugada (0-6), ponerlas al final
      const aTime = aHour < 6 ? aHour + 24 : aHour;
      const bTime = bHour < 6 ? bHour + 24 : bHour;

      if (aTime !== bTime) return aTime - bTime;
      return a.localeCompare(b);
    });
  };

  // Get time slots with availability info for a specific date
  const getTimeSlotsWithAvailability = (date: Date, partySize: number): Array<{ time: string; available: boolean }> => {
    if (!date) return [];

    const dateStr = date.toISOString().split("T")[0];
    const allSlots = getAllTimeSlots(date);

    // 🔍 Debug mejorado: comprobar disponibilidad real en cada slot
    const slotsWithAvailability = allSlots.map((timeSlot) => {
      let available = false;
      try {
        const result = hasAvailableTables(dateStr, timeSlot, partySize);
        available = Boolean(result);
      } catch (err) {
        console.error("Error checking availability for slot:", timeSlot, err);
        available = false;
      }

      console.log(`[getTimeSlotsWithAvailability] ${dateStr} ${timeSlot} -> ${available}`);

      return { time: timeSlot, available };
    });

    return slotsWithAvailability;
  };

  // Get available time slots for a specific date
  const getAvailableTimeSlots = (date: Date, partySize: number): string[] => {
    if (!date) return [];

    const dateStr = date.toISOString().split("T")[0];
    const allSlots = getAllTimeSlots(date);

    // Filter out slots that don't have available tables
    const availableSlots = allSlots.filter((timeSlot) => {
      return hasAvailableTables(dateStr, timeSlot, partySize);
    });

    return availableSlots;
  };

  // Check if there are available tables for a time slot
  const hasAvailableTables = (date: string, startTime: string, partySize: number): boolean => {
    // Find tables that can accommodate party size
    const suitableTables = tables.filter((table) => table.max_capacity >= partySize);

    if (suitableTables.length === 0) return false;

    // Calculate end time based on slot duration
    const [hour, minute] = startTime.split(":").map(Number);
    let endMinutes = hour * 60 + minute + slotDuration;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

    // Helper function to check if two time ranges overlap
    const timesOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
      const [s1Hour, s1Minute] = start1.split(":").map(Number);
      const [e1Hour, e1Minute] = end1.split(":").map(Number);
      const [s2Hour, s2Minute] = start2.split(":").map(Number);
      const [e2Hour, e2Minute] = end2.split(":").map(Number);

      let s1Minutes = s1Hour * 60 + s1Minute;
      let e1Minutes = e1Hour * 60 + e1Minute;
      let s2Minutes = s2Hour * 60 + s2Minute;
      let e2Minutes = e2Hour * 60 + e2Minute;

      // Handle midnight crossing
      if (e1Minutes < s1Minutes) e1Minutes += 24 * 60;
      if (e2Minutes < s2Minutes) e2Minutes += 24 * 60;

      // Normalize early morning hours (0-6) to be considered as next day
      if (s1Hour < 6) s1Minutes += 24 * 60;
      if (e1Hour < 6) e1Minutes += 24 * 60;
      if (s2Hour < 6) s2Minutes += 24 * 60;
      if (e2Hour < 6) e2Minutes += 24 * 60;

      // Check for overlap: ranges overlap if they don't end before the other starts
      return !(e1Minutes <= s2Minutes || s1Minutes >= e2Minutes);
    };

    // Get all bookings for this date and time slot
    const overlappingBookings = bookings.filter((booking) => {
      if (booking.booking_date !== date) return false;
      return timesOverlap(booking.start_time, booking.end_time, startTime, endTime);
    });

    console.log(`[Availability Check] Date: ${date}, Time: ${startTime}-${endTime}, Party: ${partySize}`);
    console.log(
      `[Availability Check] Suitable tables: ${suitableTables.length}`,
      suitableTables.map((t) => `T${t.table_number}(${t.max_capacity})`),
    );
    console.log(`[Availability Check] Overlapping bookings: ${overlappingBookings.length}`, overlappingBookings);

    // Count how many suitable tables are occupied
    const occupiedTableIds = new Set(
      overlappingBookings.filter((booking) => booking.table_id).map((booking) => booking.table_id),
    );

    // Check if at least one suitable table is available
    const availableTables = suitableTables.filter((table) => !occupiedTableIds.has(table.id));

    console.log(
      `[Availability Check] Available tables: ${availableTables.length}`,
      availableTables.map((t) => `T${t.table_number}(${t.max_capacity})`),
    );

    // Also need to consider bookings without assigned tables (auto-assign)
    // These consume table capacity but don't have table_id yet
    const autoBookings = overlappingBookings.filter((booking) => !booking.table_id);

    console.log(`[Availability Check] Auto bookings (no table assigned): ${autoBookings.length}`, autoBookings);

    // Calculate total capacity needed vs available
    let totalAutoCapacityNeeded = 0;
    autoBookings.forEach((booking) => {
      totalAutoCapacityNeeded += booking.party_size;
    });

    // Calculate available capacity from unoccupied suitable tables
    let totalAvailableCapacity = 0;
    availableTables.forEach((table) => {
      totalAvailableCapacity += table.max_capacity;
    });

    // Check if we have enough capacity for the new booking plus existing auto bookings
    const requiredCapacity = partySize + totalAutoCapacityNeeded;

    console.log(
      `[Availability Check] Required capacity: ${requiredCapacity} (${partySize} new + ${totalAutoCapacityNeeded} auto), Available capacity: ${totalAvailableCapacity}`,
    );

    const isAvailable = availableTables.length > 0 && totalAvailableCapacity >= requiredCapacity;
    console.log(`[Availability Check] Result: ${isAvailable ? "AVAILABLE" : "NOT AVAILABLE"}`);

    // We need at least one available table AND enough total capacity
    return isAvailable;
  };

  // Get next available time slot
  const getNextAvailableSlot = (date: Date, partySize: number): string | null => {
    const slots = getAvailableTimeSlots(date, partySize);
    return slots.length > 0 ? slots[0] : null;
  };

  return {
    isDateAvailable,
    getAllTimeSlots,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    hasAvailableTables,
    getNextAvailableSlot,
    loading,
    slotDuration,
    tables,
  };
}
