import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        console.log("⏰⏰⏰ CARGANDO HORARIOS DE DISPONIBILIDAD ⏰⏰⏰");

        const { data: slotsData, error: slotsError } = await supabase
          .from("availability_slots")
          .select("*")
          .eq("business_id", businessId);

        if (slotsError) {
          console.error("❌ ERROR cargando horarios:", slotsError);
          throw slotsError;
        }

        console.log("⏰ TOTAL DE HORARIOS ENCONTRADOS:", slotsData?.length || 0);
        console.log("📋 TODOS LOS HORARIOS:");
        slotsData?.forEach((slot, index) => {
          console.log(`⏰ Horario ${index + 1}:`, {
            id: slot.id,
            dia_semana: slot.day_of_week,
            hora_inicio: slot.start_time,
            hora_fin: slot.end_time,
            duracion_slot: slot.slot_duration_minutes,
            TODO_EL_OBJETO: slot,
          });
        });

        setAvailabilitySlots(slotsData || []);

        // Load tables
        console.log("🪑🪑🪑 CARGANDO MESAS 🪑🪑🪑");

        const { data: tablesData, error: tablesError } = await supabase
          .from("tables")
          .select("*")
          .eq("business_id", businessId);

        if (tablesError) {
          console.error("❌ ERROR cargando mesas:", tablesError);
          throw tablesError;
        }

        console.log("🪑 TOTAL DE MESAS ENCONTRADAS:", tablesData?.length || 0);
        console.log("📋 TODAS LAS MESAS:");
        tablesData?.forEach((table, index) => {
          console.log(`🪑 Mesa ${index + 1}:`, {
            id: table.id,
            numero: table.table_number,
            capacidad_maxima: table.max_capacity,
            TODO_EL_OBJETO: table,
          });
        });

        setTables(tablesData || []);

        // Load bookings (for the next 30 days)
        const today = new Date().toISOString().split("T")[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const future = futureDate.toISOString().split("T")[0];

        console.log("🔥🔥🔥 CARGANDO RESERVAS 🔥🔥🔥");
        console.log("📅 Fecha desde:", today);
        console.log("📅 Fecha hasta:", future);
        console.log("🏢 Business ID:", businessId);

        const { data: bookingsData, error: bookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", businessId)
          .gte("booking_date", today)
          .lte("booking_date", future)
          .neq("status", "cancelled")
          .neq("status", "completed");

        if (bookingsError) {
          console.error("❌ ERROR cargando reservas:", bookingsError);
          throw bookingsError;
        }

        console.log("📊 TOTAL DE RESERVAS ENCONTRADAS:", bookingsData?.length || 0);

        if (bookingsData && bookingsData.length > 0) {
          console.log("📋 TODAS LAS RESERVAS:");
          bookingsData.forEach((booking, index) => {
            console.log(`📝 Reserva ${index + 1}:`, {
              id: booking.id,
              fecha: booking.booking_date,
              hora_inicio: booking.start_time,
              hora_fin: booking.end_time,
              personas: booking.party_size,
              mesa_id: booking.table_id,
              estado: booking.status,
              cliente: booking.client_name,
              telefono: booking.client_phone,
              TODO_EL_OBJETO: booking,
            });
          });
        } else {
          console.log("❌ NO HAY RESERVAS EN LA BASE DE DATOS");
          console.log("💡 Por eso todos los horarios aparecen como disponibles");
          console.log("💡 Para probar, crea una reserva para 21:30 con 9 personas");
        }

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

        console.log("🎉🎉🎉 CARGA COMPLETA DE DATOS 🎉🎉🎉");
        console.log("📊 RESUMEN FINAL:");
        console.log("⏰ Horarios de disponibilidad:", availabilitySlots.length);
        console.log("🪑 Mesas:", tables.length);
        console.log("📝 Reservas:", bookings.length);
        console.log("⏱️ Duración de slot:", businessData?.booking_slot_duration_minutes || 60, "minutos");
        console.log("🏢 Business ID:", businessId);
        console.log("📅 Fecha actual:", today);
        console.log("📅 Fecha límite:", future);

        // 🔍 CONSULTA DIRECTA A LA BASE DE DATOS PARA VERIFICAR
        console.log("🔍🔍🔍 CONSULTA DIRECTA A LA BASE DE DATOS 🔍🔍🔍");

        // Consultar TODAS las reservas sin filtros
        const { data: allBookings, error: allBookingsError } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", businessId);

        if (allBookingsError) {
          console.error("❌ Error consultando todas las reservas:", allBookingsError);
        } else {
          console.log("📊 TOTAL DE RESERVAS EN LA BASE DE DATOS:", allBookings?.length || 0);
          if (allBookings && allBookings.length > 0) {
            console.log("📋 TODAS LAS RESERVAS EN LA BD:");
            allBookings.forEach((booking, index) => {
              console.log(`📝 Reserva BD ${index + 1}:`, {
                id: booking.id,
                fecha: booking.booking_date,
                hora_inicio: booking.start_time,
                hora_fin: booking.end_time,
                personas: booking.party_size,
                mesa_id: booking.table_id,
                estado: booking.status,
                cliente: booking.client_name,
                TODO_EL_OBJETO: booking,
              });
            });
          }
        }

        // Consultar específicamente reservas para el 14 de octubre
        const { data: bookingsOct14, error: bookingsOct14Error } = await supabase
          .from("bookings")
          .select("*")
          .eq("business_id", businessId)
          .eq("booking_date", "2025-10-14");

        if (bookingsOct14Error) {
          console.error("❌ Error consultando reservas del 14:", bookingsOct14Error);
        } else {
          console.log("📅 RESERVAS ESPECÍFICAS PARA 2025-10-14:", bookingsOct14?.length || 0);
          if (bookingsOct14 && bookingsOct14.length > 0) {
            console.log("📋 RESERVAS DEL 14 DE OCTUBRE:");
            bookingsOct14.forEach((booking, index) => {
              console.log(`📝 Reserva 14/10 ${index + 1}:`, {
                id: booking.id,
                fecha: booking.booking_date,
                hora_inicio: booking.start_time,
                hora_fin: booking.end_time,
                personas: booking.party_size,
                mesa_id: booking.table_id,
                estado: booking.status,
                cliente: booking.client_name,
              });
            });
          } else {
            console.log("❌ NO HAY RESERVAS PARA EL 14 DE OCTUBRE");
          }
        }
      } catch (error) {
        console.error("❌ ERROR cargando datos de disponibilidad:", error);
        console.error("Error al cargar disponibilidad");
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
        (payload) => {
          console.log("Booking change detected:", payload);
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

    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const allSlots = getAllTimeSlots(date);

    return allSlots.map((timeSlot) => ({
      time: timeSlot,
      available: hasAvailableTables(localDateStr, timeSlot, partySize),
    }));
  };

  // Get available time slots for a specific date
  const getAvailableTimeSlots = (date: Date, partySize: number): string[] => {
    if (!date) return [];

    console.log(`🗓️ [CONVERSIÓN DE FECHA] Fecha original:`, date);
    console.log(`🗓️ [CONVERSIÓN DE FECHA] toISOString():`, date.toISOString());

    const dateStr = date.toISOString().split("T")[0];
    console.log(`🗓️ [CONVERSIÓN DE FECHA] Fecha convertida: "${dateStr}"`);

    // Alternativa: usar métodos locales
    const localDateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    console.log(`🗓️ [CONVERSIÓN DE FECHA] Fecha local: "${localDateStr}"`);

    const allSlots = getAllTimeSlots(date);

    // Filter out slots that don't have available tables
    const availableSlots = allSlots.filter((timeSlot) => {
      return hasAvailableTables(localDateStr, timeSlot, partySize);
    });

    return availableSlots;
  };

  // Check if there are available tables for a time slot - SIMPLIFIED VERSION
  const hasAvailableTables = (date: string, startTime: string, partySize: number): boolean => {
    console.log(`🔍 [NUEVA VERIFICACIÓN] Fecha recibida: "${date}", Hora: ${startTime}, Personas: ${partySize}`);
    console.log(`📅 Tipo de fecha: ${typeof date}, Longitud: ${date.length}`);

    // 1. Buscar mesas que puedan acomodar al grupo
    const suitableTables = tables.filter((table) => table.max_capacity >= partySize);
    console.log(
      `📋 Mesas adecuadas para ${partySize} personas:`,
      suitableTables.map((t) => `Mesa ${t.table_number} (${t.max_capacity} pers)`),
    );

    if (suitableTables.length === 0) {
      console.log(`❌ NO hay mesas que puedan acomodar ${partySize} personas`);
      return false;
    }

    // 2. Buscar reservas que se superpongan con este horario
    const bookingsForDate = bookings.filter((booking) => booking.booking_date === date);
    console.log(`📅 Todas las reservas para ${date}:`, bookingsForDate);

    // 3. Función simple para verificar superposición
    const isTimeOverlapping = (
      bookingStart: string,
      bookingEnd: string,
      slotStart: string,
      slotEnd: string,
    ): boolean => {
      const bookingStartMin = parseInt(bookingStart.split(":")[0]) * 60 + parseInt(bookingStart.split(":")[1]);
      const bookingEndMin = parseInt(bookingEnd.split(":")[0]) * 60 + parseInt(bookingEnd.split(":")[1]);
      const slotStartMin = parseInt(slotStart.split(":")[0]) * 60 + parseInt(slotStart.split(":")[1]);
      const slotEndMin = parseInt(slotEnd.split(":")[0]) * 60 + parseInt(slotEnd.split(":")[1]);

      // Verificar si hay superposición
      const overlaps = !(bookingEndMin <= slotStartMin || bookingStartMin >= slotEndMin);

      if (slotStart === "21:30") {
        console.log(
          `⏰ [21:30] Verificando: ${bookingStart}-${bookingEnd} vs ${slotStart}-${slotEnd} = ${overlaps ? "SUPERPONE" : "NO SUPERPONE"}`,
        );
      }

      return overlaps;
    };

    // 4. Calcular hora de fin del slot
    const [hour, minute] = startTime.split(":").map(Number);
    const endMinutes = hour * 60 + minute + slotDuration;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMinute = endMinutes % 60;
    const endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;

    // 5. Buscar reservas superpuestas
    const overlappingBookings = bookingsForDate.filter((booking) =>
      isTimeOverlapping(booking.start_time, booking.end_time, startTime, endTime),
    );

    console.log(`🔄 Reservas superpuestas con ${startTime}-${endTime}:`, overlappingBookings);

    // 6. Verificar qué mesas están ocupadas
    const occupiedTableIds = new Set(
      overlappingBookings.filter((booking) => booking.table_id).map((booking) => booking.table_id),
    );

    console.log(`🚫 Mesas ocupadas:`, Array.from(occupiedTableIds));

    // 7. Encontrar mesas disponibles
    const availableTables = suitableTables.filter((table) => !occupiedTableIds.has(table.id));
    console.log(
      `✅ Mesas disponibles para ${partySize} personas:`,
      availableTables.map((t) => `Mesa ${t.table_number} (${t.max_capacity} pers)`),
    );

    // 8. Verificar si hay al menos una mesa disponible
    const hasAvailableTable = availableTables.length > 0;

    console.log(`🎯 RESULTADO FINAL para ${startTime}: ${hasAvailableTable ? "DISPONIBLE" : "NO DISPONIBLE"}`);

    return hasAvailableTable;
  };

  // Get next available time slot
  const getNextAvailableSlot = (date: Date, partySize: number): string | null => {
    const slots = getAvailableTimeSlots(date, partySize);
    return slots.length > 0 ? slots[0] : null;
  };

  // Force refresh availability data
  const refreshAvailability = async () => {
    if (!businessId) return;

    try {
      setLoading(true);

      // Reload all data
      const { data: slotsData, error: slotsError } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("business_id", businessId);

      if (slotsError) throw slotsError;
      setAvailabilitySlots(slotsData || []);

      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("*")
        .eq("business_id", businessId);

      if (tablesError) throw tablesError;
      setTables(tablesData || []);

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

      console.log("Availability data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing availability data:", error);
      console.error("Error al actualizar disponibilidad");
    } finally {
      setLoading(false);
    }
  };

  return {
    isDateAvailable,
    getAllTimeSlots,
    getTimeSlotsWithAvailability,
    getAvailableTimeSlots,
    hasAvailableTables,
    getNextAvailableSlot,
    refreshAvailability,
    loading,
    slotDuration,
    tables,
  };
}
