import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create admin client with service_role key for bypassing RLS
const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Input validation schema
const PublicBookingSchema = z.object({
  businessId: z.string().uuid({ message: "Invalid business ID format" }),
  clientId: z.string().uuid({ message: "Invalid client ID format" }).optional(), // ID del usuario autenticado
  clientName: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
  clientPhone: z.string().trim().min(1, "Phone number is required"),
  clientEmail: z.string().trim().email("Invalid email format").max(255, "Email is too long").optional(),
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (use HH:MM)"),
  partySize: z.number().int("Party size must be a whole number").min(1, "Party size must be at least 1").max(50, "Party size cannot exceed 50"),
  roomId: z.string().uuid({ message: "Invalid room ID format" }).optional(),
  notes: z.string().max(500, "Notes are too long").optional()
});

async function findAvailableTable(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  businessId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  partySize: number,
  roomId?: string
): Promise<{ tableId: string | null; status: string }> {
  // Get all tables for the business (filtered by room if provided)
  let query = supabase
    .from("tables")
    .select("id, max_capacity")
    .eq("business_id", businessId)
    .gte("max_capacity", partySize);

  // Filter by room if specified
  if (roomId) {
    query = query.eq("room_id", roomId);
  }

  const { data: tables, error: tablesError } = await query.order("max_capacity", { ascending: true });

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
    const tableBookings = existingBookings?.filter((b: any) => b.table_id === table.id) || [];
    
    const isAvailable = !tableBookings.some((booking: any) =>
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
    // Use admin client with service_role key to bypass RLS
    const supabase = getSupabaseAdmin();

    // Parse and validate request body
    const rawBody = await req.json();
    console.log("📥 create-reservation request body:", JSON.stringify(rawBody));

    const validationResult = PublicBookingSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error("❌ STEP: validation | Validation failed:", validationResult.error.issues);
      const errorMessages = validationResult.error.issues.map(issue => issue.message).join(", ");
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'validation',
          error: "Datos de entrada inválidos", 
          details: errorMessages,
          issues: validationResult.error.issues 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      businessId, 
      clientId,
      clientName, 
      clientEmail, 
      clientPhone, 
      bookingDate, 
      startTime, 
      partySize,
      roomId,
      notes 
    } = validationResult.data;

    console.log("✅ STEP: validation | Input validated successfully");

    // Validate date is not in the past
    const bookingDateObj = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (bookingDateObj < today) {
      console.error("❌ STEP: date-validation | Booking date is in the past");
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'date-validation',
          error: "No se pueden crear reservas para fechas pasadas" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ STEP: date-validation | Date is valid");

    // Get business information and verify it exists and is active
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("booking_slot_duration_minutes, phone, is_active, booking_mode")
      .eq("id", businessId)
      .eq("is_active", true)
      .maybeSingle();

    if (businessError || !business) {
      console.error("❌ STEP: business-lookup | Business not found or inactive:", businessError);
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'business-lookup',
          error: "Negocio no encontrado o no acepta reservas" 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmationMode = business?.booking_mode ?? 'automatic';
    console.log("📌 confirmationMode =", confirmationMode);
    console.log("✅ STEP: business-lookup | Business found:", businessId);

    // Check rate limiting for this business
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_business_id: businessId,
      p_endpoint: 'public-booking',
      p_max_requests: 20,
      p_window_minutes: 60
    });

    if (rateLimitError || !rateLimitOk) {
      console.error('❌ STEP: rate-limit | Rate limit exceeded for business:', businessId);
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'rate-limit',
          error: 'Demasiadas solicitudes de reserva. Por favor, intenta más tarde.' 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ STEP: rate-limit | Rate limit OK");

    // Calculate end time based on business slot duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0);
    
    const endDate = new Date(startDate.getTime() + business.booking_slot_duration_minutes * 60000);
    const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

    console.log("✅ STEP: time-calculation | End time calculated:", endTime);

    // Determine booking flow based on confirmation mode
    let tableId: string | null = null;
    let bookingStatus: string;
    let responseMessage: string;

    if (confirmationMode === 'manual') {
      // MANUAL CONFIRMATION MODE
      bookingStatus = "pending_business_confirmation";
      tableId = null; // No table assignment for manual confirmation
      responseMessage = "Tu reserva ha sido enviada correctamente. El negocio contactará contigo para confirmarla.";
      console.log("📌 STEP: booking-mode | Manual confirmation - no table assignment");
    } else {
      // AUTOMATIC CONFIRMATION MODE
      console.log("📌 STEP: booking-mode | Automatic confirmation - checking table availability");
      
      const result = await findAvailableTable(
        supabase,
        businessId,
        bookingDate,
        startTime,
        endTime,
        partySize,
        roomId
      );
      
      tableId = result.tableId;
      
      if (tableId === null) {
        console.error("❌ STEP: table-availability | No tables available");
        return new Response(
          JSON.stringify({ 
            success: false,
            step: 'table-availability',
            error: "No hay disponibilidad para la fecha y hora seleccionadas. Por favor, elige otro horario." 
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      bookingStatus = "confirmed";
      responseMessage = "Reserva creada correctamente";
      console.log("✅ STEP: table-availability | Table assigned:", tableId);
    }

    // Get or create time_slot_id - REQUIRED for all bookings
    console.log("📌 STEP: time-slot | Looking up time slot for:", startTime);
    
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from("time_slots")
      .select("id")
      .eq("slot_time", startTime)
      .maybeSingle();

    if (timeSlotError) {
      console.error("❌ STEP: time-slot | Error fetching time slot:", timeSlotError);
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'time-slot',
          error: "Error al procesar la hora seleccionada. Por favor, intenta de nuevo.",
          details: timeSlotError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let timeSlotId: string;

    if (!timeSlot) {
      console.log("📌 STEP: time-slot | Time slot not found, creating new one");
      
      // Create time slot on the fly with upsert-safe approach
      const timeSlotOrder = Math.floor((parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1])) / 15);
      
      const { data: newTimeSlot, error: createError } = await supabase
        .from("time_slots")
        .insert({
          slot_time: startTime,
          slot_order: timeSlotOrder
        })
        .select("id")
        .maybeSingle();

      if (createError || !newTimeSlot) {
        console.error("❌ STEP: time-slot-create | Could not create time slot:", createError);
        return new Response(
          JSON.stringify({ 
            success: false,
            step: 'time-slot-create',
            error: "No se pudo procesar la reserva. Por favor, contacta con el negocio directamente.",
            details: createError?.message
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      timeSlotId = newTimeSlot.id;
      console.log("✅ STEP: time-slot-create | Created new time slot:", timeSlotId);
    } else {
      timeSlotId = timeSlot.id;
      console.log("✅ STEP: time-slot | Time slot found:", timeSlotId);
    }

    // Create the booking with time_slot_id
    console.log("📌 STEP: booking-insert | Creating booking with status:", bookingStatus);
    
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        business_id: businessId,
        client_id: clientId || null, // Incluir client_id si el usuario está autenticado
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
        room_id: roomId || null,
        business_phone: business.phone,
        time_slot_id: timeSlotId
      })
      .select()
      .maybeSingle();

    if (bookingError) {
      console.error("❌ STEP: booking-insert | Booking creation failed:", bookingError);
      return new Response(
        JSON.stringify({ 
          success: false,
          step: 'booking-insert',
          error: "No se pudo crear la reserva. Por favor, intenta de nuevo.",
          details: bookingError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ STEP: booking-insert | Booking created successfully:", booking?.id);
    console.log("📊 FINAL RESULT:", {
      bookingId: booking?.id,
      status: bookingStatus,
      tableId: tableId,
      confirmationMode: confirmationMode
    });

    // Send confirmation email (non-blocking)
    if (booking?.id && clientEmail) {
      supabase.functions.invoke('send-booking-email', {
        body: { bookingId: booking.id }
      }).then(({ error: emailError }: { error: any }) => {
        if (emailError) {
          console.error('⚠️ Email notification failed:', emailError);
        } else {
          console.log('✅ Confirmation email sent to:', clientEmail);
        }
      }).catch((err: any) => {
        console.error('⚠️ Email service error:', err);
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking,
        message: responseMessage
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ FATAL ERROR:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        success: false,
        step: 'unexpected-error',
        error: "Ocurrió un error al procesar tu reserva. Por favor, intenta de nuevo.",
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});