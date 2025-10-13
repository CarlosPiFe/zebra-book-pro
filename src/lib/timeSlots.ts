import { supabase } from "@/integrations/supabase/client";

// Cache for time slots to avoid repeated queries
let timeSlotsCache: Map<string, string> | null = null;

/**
 * Get the time_slot_id for a given time
 * @param time - Time in HH:MM format
 * @returns The time_slot_id or null if not found
 */
export async function getTimeSlotId(time: string): Promise<string | null> {
  try {
    // Load cache if not loaded
    if (!timeSlotsCache) {
      const { data, error } = await supabase
        .from("time_slots")
        .select("id, slot_time")
        .order("slot_order");

      if (error) {
        console.error("Error loading time slots:", error);
        return null;
      }

      timeSlotsCache = new Map();
      data?.forEach((slot) => {
        // Store without seconds (HH:MM format)
        const timeKey = slot.slot_time.substring(0, 5);
        timeSlotsCache!.set(timeKey, slot.id);
      });
    }

    // Extract hour from the time (HH:00)
    const [hour] = time.split(':');
    const hourKey = `${hour.padStart(2, '0')}:00`;
    
    return timeSlotsCache.get(hourKey) || null;
  } catch (error) {
    console.error("Error getting time slot ID:", error);
    return null;
  }
}

/**
 * Clear the time slots cache (useful for testing or if slots are updated)
 */
export function clearTimeSlotCache() {
  timeSlotsCache = null;
}
