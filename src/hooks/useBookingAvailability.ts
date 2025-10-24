// src/hooks/useBookingAvailability.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getMadridDateString, getDayOfWeekInMadrid } from '@/lib/timezone';
import { toast } from 'sonner';

// El objeto que nuestra nueva función SQL devolverá
interface AvailableSlot {
  time: string;
  available: boolean;
}

export function useBookingAvailability(businessId: string | undefined) {
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<Record<string, boolean>>(
    {},
  );
  
  // --- EL NUEVO CEREBRO (CÁLCULO EN EL SERVIDOR) ---
  /**
   * Esta función llama a una función RPC en Supabase ('get_available_slots').
   * El 100% del cálculo de disponibilidad (mesas, empleados, vacaciones, reservas)
   * se hace en el servidor, de forma rápida y segura.
   */
  const fetchAvailability = useCallback(
    async (
      selectedDate: Date,
      partySize: number,
      roomId?: string,
    ) => {
      if (!businessId || !selectedDate || !partySize) {
        setSlots([]);
        return;
      }

      setLoading(true);
      setSlots([]); // Limpiar slots anteriores

      try {
        // 1. Usar nuestra nueva función de timezone para GARANTIZAR la fecha correcta
        const dateString = getMadridDateString(selectedDate);

        // 2. Llamar a la función inteligente en Supabase
        const { data, error } = await supabase.rpc('get_available_slots', {
          p_business_id: businessId,
          p_date: dateString,
          p_party_size: partySize,
          p_room_id: roomId || null,
        });

        if (error) {
          console.error('Error from RPC get_available_slots:', error);
          throw new Error(
            'No se pudo verificar la disponibilidad. ' + error.message,
          );
        }
  
        // 3. Guardar los resultados (ej: [{time: "12:00", available: true}, {time: "12:30", available: false}])
        setSlots(data || []);

      } catch (error: any) {
        console.error('Error fetching availability:', error);
        toast.error(error.message || 'Error al cargar horarios');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    },
    [businessId],
  );

  /**
   * Esta función comprueba si un día está abierto (si hay 'availability_slots')
   * Lo guardamos en un 'cache' (availableDates) para no preguntar mil veces.
   */
  const isDateAvailable = useCallback(
    async (date: Date): Promise<boolean> => {
      if (!businessId) return false;

      // 1. Usar nuestra nueva función de timezone para GARANTIZAR el día correcto
      const dayOfWeek = getDayOfWeekInMadrid(date);
      const cacheKey = `${businessId}-${dayOfWeek}`;

      // 2. Si ya lo comprobamos, usar el cache
      if (availableDates[cacheKey] !== undefined) {
        return availableDates[cacheKey];
      }

      // 3. Si no, preguntar a la BBDD si el negocio abre ese día
      try {
        const { data, error, count } = await supabase
          .from('availability_slots')
          .select('id', { count: 'exact', head: true }) // Solo pide el conteo, no los datos
          .eq('business_id', businessId)
          .eq('day_of_week', dayOfWeek);

        if (error) throw error;
  
        const isOpen = (count || 0) > 0;
        setAvailableDates((prev) => ({ ...prev, [cacheKey]: isOpen }));
        return isOpen;

      } catch (error) {
        console.error('Error checking date availability:', error);
        return false;
      }
    },
    [businessId, availableDates],
  );

  return {
    loading: loading,
    slots, // Los slots con su disponibilidad (ej: {time: "12:00", available: true})
    fetchAvailability, // La función para buscar slots
    isDateAvailable, // La función para saber si el día está abierto
  };
}