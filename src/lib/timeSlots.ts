import { supabase } from "@/integrations/supabase/client";

/**
 * Obtiene el time_slot_id correspondiente a una hora dada
 * @param time Hora en formato HH:MM
 * @returns UUID del time_slot o null si no se encuentra
 */
export async function getTimeSlotId(time: string): Promise<string | null> {
  try {
    // Extraer la hora sin minutos (redondear hacia abajo)
    const [hours] = time.split(":").map(Number);
    const slotTime = `${String(hours).padStart(2, "0")}:00:00`;

    const { data, error } = await supabase
      .from("time_slots")
      .select("id")
      .eq("slot_time", slotTime)
      .single();

    if (error) {
      console.error("Error fetching time slot:", error);
      return null;
    }

    return data?.id || null;
  } catch (error) {
    console.error("Error in getTimeSlotId:", error);
    return null;
  }
}
