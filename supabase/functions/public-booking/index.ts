import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        status: 'reserved',
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
