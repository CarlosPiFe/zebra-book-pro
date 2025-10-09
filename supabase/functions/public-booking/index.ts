import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function findAvailableTable(
  supabase: any,
  businessId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  partySize: number
): Promise<{ tableId: string | null; status: string }> {
  // Get all tables for the business
  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("id, max_capacity")
    .eq("business_id", businessId)
    .gte("max_capacity", partySize)
    .order("max_capacity", { ascending: true });

  if (tablesError || !tables || tables.length === 0) {
    console.log("No tables found with sufficient capacity");
    return { tableId: null, status: "pending" };
  }

  // Get all bookings for the same date
  const { data: existingBookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("table_id, start_time, end_time")
    .eq("booking_date", bookingDate)
    .neq("status", "cancelled")
    .not("table_id", "is", null);

  if (bookingsError) {
    console.error("Error fetching bookings:", bookingsError);
    return { tableId: null, status: "pending" };
  }

  // Helper function to check time overlap
  const hasTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
    const toMinutes = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    let s1 = toMinutes(start1);
    let e1 = toMinutes(end1);
    let s2 = toMinutes(start2);
    let e2 = toMinutes(end2);

    // Handle midnight crossing
    if (e1 < s1) e1 += 24 * 60;
    if (e2 < s2) e2 += 24 * 60;

    return s1 < e2 && e1 > s2;
  };

  // Check each table for availability
  for (const table of tables) {
    const tableBookings = existingBookings?.filter(b => b.table_id === table.id) || [];
    
    const isAvailable = !tableBookings.some(booking =>
      hasTimeOverlap(startTime, endTime, booking.start_time, booking.end_time)
    );

    if (isAvailable) {
      console.log(`Table ${table.id} is available`);
      return { tableId: table.id, status: "reserved" };
    }
  }

  console.log("No available tables found, marking as pending");
  return { tableId: null, status: "pending" };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      businessId, 
      clientName, 
      clientEmail, 
      clientPhone, 
      bookingDate, 
      startTime, 
      partySize,
      notes 
    } = await req.json();

    // Validate required fields
    if (!businessId || !clientName || !clientPhone || !bookingDate || !startTime || !partySize) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business information to calculate end time
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("booking_slot_duration_minutes, phone")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate end time based on business slot duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const endDate = new Date(startDate.getTime() + business.booking_slot_duration_minutes * 60000);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    // Find available table
    const { tableId, status } = await findAvailableTable(
      supabase,
      businessId,
      bookingDate,
      startTime,
      endTime,
      partySize
    );

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        client_name: clientName,
        client_email: clientEmail || null,
        client_phone: clientPhone,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        party_size: partySize,
        notes: notes || null,
        status: status,
        table_id: tableId,
        business_phone: business.phone
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking", details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        message: "Reserva creada correctamente" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
