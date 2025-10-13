import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Table {
  id: string;
  max_capacity: number;
  business_id: string;
}

interface Booking {
  id: string;
  business_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  party_size: number;
  table_id: string | null;
}

export const useBookingAvailability = (businessId?: string) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) loadData();
  }, [businessId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: tablesData } = await supabase.from("tables").select("*").eq("business_id", businessId);

      const { data: bookingsData } = await supabase.from("bookings").select("*").eq("business_id", businessId);

      setTables(tablesData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error loading availability data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const getAllTimeSlots = (date: Date): string[] => {
    const slots: string[] = [];
    for (let hour = 10; hour <= 23; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const timesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const [hA, mA] = startA.split(":").map(Number);
    const [hB, mB] = startB.split(":").map(Number);
    const [hAend, mAend] = endA.split(":").map(Number);
    const [hBend, mBend] = endB.split(":").map(Number);

    const start1 = hA * 60 + mA;
    const end1 = hAend * 60 + mAend;
    const start2 = hB * 60 + mB;
    const end2 = hBend * 60 + mBend;

    return start1 < end2 && start2 < end1;
  };

  const hasAvailableTables = (date: string, startTime: string, partySize: number): boolean => {
    if (!tables.length) return false;

    const duration = 60;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const endTime = format(new Date(0, 0, 0, startHour, startMinute + duration), "HH:mm");

    const bookingsForDate = bookings.filter((b) => b.booking_date === date);
    const availableTables = tables.filter((table) => {
      const overlappingBookings = bookingsForDate.filter((booking) => {
        if (booking.table_id !== table.id) return false;
        return timesOverlap(startTime, endTime, booking.start_time, booking.end_time);
      });
      return overlappingBookings.length === 0;
    });

    const totalAvailableCapacity = availableTables.reduce((acc, t) => acc + t.max_capacity, 0);

    const isAvailable = totalAvailableCapacity >= partySize;

    return isAvailable;
  };

  // ✅ Aquí está el cambio que añadimos
  const getTimeSlotsWithAvailability = (date: Date, partySize: number): Array<{ time: string; available: boolean }> => {
    if (!date) return [];

    const dateStr = date.toISOString().split("T")[0];
    const allSlots = getAllTimeSlots(date);

    // 🧠 Nuevo bloque con log de depuración
    const slotsWithAvailability = allSlots.map((timeSlot) => {
      let available = false;

      try {
        const result = hasAvailableTables(dateStr, timeSlot, partySize);
        available = Boolean(result);
      } catch (err) {
        console.error("❌ Error comprobando slot:", timeSlot, err);
        available = false;
      }

      console.log(`[getTimeSlotsWithAvailability] ${dateStr} ${timeSlot} -> ${available}`);

      return { time: timeSlot, available };
    });

    return slotsWithAvailability;
  };

  const getAvailableTimeSlots = (date: Date, partySize: number): string[] => {
    const slots = getTimeSlotsWithAvailability(date, partySize);
    return slots.filter((s) => s.available).map((s) => s.time);
  };

  const getNextAvailableSlot = (date: Date, partySize: number): string | null => {
    const availableSlots = getAvailableTimeSlots(date, partySize);
    return availableSlots.length > 0 ? availableSlots[0] : null;
  };

  return {
    isDateAvailable,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    getNextAvailableSlot,
    hasAvailableTables,
    tables,
    bookings,
    loading,
  };
};
