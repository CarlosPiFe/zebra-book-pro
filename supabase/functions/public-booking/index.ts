import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const PublicBookingSchema = z.object({
  businessId: z.string().uuid({ message: "Invalid business ID format" }),
  clientName: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  clientPhone: z.string().trim().min(1, "Phone number is required"),
  clientEmail: z.string().trim().email("Invalid email format").max(255, "Email is too long").optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (use HH:MM)"),
  partySize: z.number().int("Party size must be a whole number").min(1, "Party size must be at least 1").max(50, "Party size cannot exceed 50"),
  notes: z.string().max(500, "Notes are too long").optional()
});

async function findAvailableTable(
  supabase: SupabaseClient,
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
    .neq("status", "completed")
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

    // Parse and validate request body
    const rawBody = await req.json();
    console.log("Public booking request received");

    const validationResult = PublicBookingSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("Validation failed:", validationResult.error.issues);
      const errorMessages = validationResult.error.issues.map(issue => issue.message).join(", ");
      return new Response(
        JSON.stringify({ 
          error: "Invalid input data", 
          details: errorMessages,
          issues: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      businessId, 
      clientName, 
      clientEmail, 
      clientPhone, 
      bookingDate, 
      startTime, 
      partySize,
      notes 
    } = validationResult.data;

    // Validate date is not in the past
    const bookingDateObj = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDateObj < today) {
      return new Response(
        JSON.stringify({ error: "Cannot create bookings for past dates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get business information and verify it exists and is active
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("booking_slot_duration_minutes, phone, is_active, booking_mode")
      .eq("id", businessId)
      .eq("is_active", true)
      .single();

    if (businessError || !business) {
      console.error("Business not found or inactive:", businessError);
      return new Response(
        JSON.stringify({ error: "Business not found or not accepting bookings" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limiting for this business
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_business_id: businessId,
      p_endpoint: 'public-booking',
      p_max_requests: 20,
      p_window_minutes: 60
    });

    if (rateLimitError || !rateLimitOk) {
      console.error('Rate limit exceeded for business:', businessId);
      return new Response(
        JSON.stringify({ error: 'Too many booking requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate end time based on business slot duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const endDate = new Date(startDate.getTime() + business.booking_slot_duration_minutes * 60000);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    // Get time_slot_id - REQUIRED for all bookings
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from("time_slots")
      .select("id")
      .eq("slot_time", startTime)
      .single();

    if (timeSlotError || !timeSlot) {
      console.error("Time slot not found for:", startTime, timeSlotError);
      return new Response(
        JSON.stringify({ error: "Invalid time slot selected" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check booking mode
    const isManualConfirmation = business.booking_mode === 'manual';
    
    let tableId: string | null = null;
    let bookingStatus: string;
    let responseMessage: string;

    if (isManualConfirmation) {
      // Manual confirmation mode: create booking without table assignment
      bookingStatus = "pending_confirmation";
      responseMessage = "Tu reserva ha sido enviada correctamente. El negocio contactará contigo para confirmarla.";
      console.log("Creating booking in manual confirmation mode - no table assignment");
    } else {
      // Automatic confirmation mode: find and assign table
      const result = await findAvailableTable(
        supabase,
        businessId,
        bookingDate,
        startTime,
        endTime,
        partySize
      );
      
      tableId = result.tableId;
      
      // If no table is available in automatic mode, return error
      if (tableId === null) {
        console.log("No hay disponibilidad para esta fecha y hora");
        return new Response(
          JSON.stringify({ 
            error: "No hay disponibilidad para la fecha y hora seleccionadas. Por favor, elige otro horario." 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      bookingStatus = "reserved";
      responseMessage = "Reserva creada correctamente";
    }

    // Create the booking with time_slot_id
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
        status: bookingStatus,
        table_id: tableId,
        business_phone: business.phone,
        time_slot_id: timeSlot.id
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

    console.log("Booking created successfully:", booking.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        message: responseMessage
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "An error occurred processing your booking", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});