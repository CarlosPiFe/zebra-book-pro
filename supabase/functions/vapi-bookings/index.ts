import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-secret",
};

// Input validation schemas
const CreateBookingSchema = z.object({
  action: z.literal('create'),
  business_id: z.string().uuid(),
  client_name: z.string().trim().min(1).max(100),
  client_phone: z.string().trim().min(10).max(20).regex(/^[\d\s+()-]+$/),
  client_email: z.string().trim().email().max(255).optional(),
  party_size: z.number().int().min(1).max(50),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  notes: z.string().max(500).optional()
});

const CancelBookingSchema = z.object({
  action: z.literal('cancel'),
  booking_id: z.string().uuid()
});

const UpdateBookingSchema = z.object({
  action: z.literal('update'),
  booking_id: z.string().uuid(),
  client_name: z.string().trim().min(1).max(100).optional(),
  client_phone: z.string().trim().min(10).max(20).regex(/^[\d\s+()-]+$/).optional(),
  client_email: z.string().trim().email().max(255).optional(),
  party_size: z.number().int().min(1).max(50).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  notes: z.string().max(500).optional(),
  status: z.enum(['reserved', 'confirmed', 'cancelled', 'completed']).optional()
});

const CheckAvailabilitySchema = z.object({
  action: z.literal('check_availability'),
  business_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  party_size: z.number().int().min(1).max(50)
});

const ListBookingsSchema = z.object({
  action: z.literal('list'),
  business_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

const RequestSchema = z.discriminatedUnion('action', [
  CreateBookingSchema,
  CancelBookingSchema,
  UpdateBookingSchema,
  CheckAvailabilitySchema,
  ListBookingsSchema
]);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Vapi bookings webhook triggered');
    
    // Verify Vapi API key
    const vapiSecret = req.headers.get("x-vapi-secret");
    const expectedSecret = Deno.env.get("VAPI_API_KEY");
    
    if (!vapiSecret || vapiSecret !== expectedSecret) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized' 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse and validate request body
    const rawBody = await req.json();
    console.log('Request action:', rawBody.action);
    
    const validationResult = RequestSchema.safeParse(rawBody);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request data',
          message: 'Please check your input and try again'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const body = validationResult.data;

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Route to appropriate handler
    let result;
    switch (body.action) {
      case "create":
        result = await createBooking(supabase, body);
        break;
      case "cancel":
        result = await cancelBooking(supabase, body);
        break;
      case "update":
        result = await updateBooking(supabase, body);
        break;
      case "check_availability":
        result = await checkAvailability(supabase, body);
        break;
      case "list":
        result = await listBookings(supabase, body);
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error('Error processing vapi-bookings request:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred processing your request',
        message: 'Please try again later or contact support'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function createBooking(supabase: any, body: z.infer<typeof CreateBookingSchema>) {
  // Verify business exists and is active
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", body.business_id)
    .eq("is_active", true)
    .single();

  if (businessError || !business) {
    console.error('Business verification failed:', businessError);
    return {
      success: false,
      error: { code: "BUSINESS_NOT_FOUND", message: "Business not found or inactive" }
    };
  }

  // Find available table
  const { tableId, status } = await findAvailableTable(
    supabase,
    body.business_id,
    body.booking_date,
    body.start_time,
    body.end_time,
    body.party_size
  );

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      business_id: body.business_id,
      table_id: tableId,
      client_name: body.client_name,
      client_phone: body.client_phone,
      client_email: body.client_email || null,
      booking_date: body.booking_date,
      start_time: body.start_time,
      end_time: body.end_time,
      party_size: body.party_size,
      notes: body.notes || null,
      status,
    })
    .select()
    .single();

  if (bookingError) {
    console.error('Booking creation failed:', bookingError);
    return {
      success: false,
      error: { 
        code: 'BOOKING_FAILED', 
        message: 'Unable to create booking. Please check your information and try again.' 
      }
    };
  }

  // Get table number if assigned
  let tableNumber = null;
  if (tableId) {
    const { data: table } = await supabase
      .from("tables")
      .select("table_number")
      .eq("id", tableId)
      .single();
    tableNumber = table?.table_number;
  }

  console.log("Booking created:", { booking_id: booking.id, status, table_number: tableNumber });

  return {
    success: true,
    data: {
      booking_id: booking.id,
      table_number: tableNumber,
      status,
      booking_date: body.booking_date,
      start_time: body.start_time,
      end_time: body.end_time,
      party_size: body.party_size,
      message: status === "reserved" 
        ? `Reserva confirmada en mesa ${tableNumber}`
        : "Reserva en lista de espera - sin mesas disponibles"
    }
  };
}

async function cancelBooking(supabase: any, body: z.infer<typeof CancelBookingSchema>) {
  // Update booking status to cancelled
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", body.booking_id)
    .select()
    .single();

  if (error) {
    console.error('Booking cancellation failed:', error);
    return {
      success: false,
      error: { 
        code: 'CANCEL_FAILED', 
        message: 'Unable to cancel booking. Please try again or contact support.' 
      }
    };
  }

  console.log("Booking cancelled:", body.booking_id);

  return {
    success: true,
    data: {
      booking_id: body.booking_id,
      status: "cancelled",
      message: "Reserva cancelada correctamente"
    }
  };
}

async function updateBooking(supabase: any, body: z.infer<typeof UpdateBookingSchema>) {
  // Get current booking
  const { data: currentBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", body.booking_id)
    .single();

  if (fetchError || !currentBooking) {
    console.error('Booking not found:', fetchError);
    return {
      success: false,
      error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" }
    };
  }

  // Prepare update data
  const updateData: any = {};
  if (body.client_name) updateData.client_name = body.client_name;
  if (body.client_phone) updateData.client_phone = body.client_phone;
  if (body.client_email !== undefined) updateData.client_email = body.client_email || null;
  if (body.notes !== undefined) updateData.notes = body.notes || null;

  // If date/time/party_size changes, need to reassign table
  const needsReassignment = body.booking_date || body.start_time || body.end_time || body.party_size;

  if (needsReassignment) {
    const finalDate = body.booking_date || currentBooking.booking_date;
    const finalStartTime = body.start_time || currentBooking.start_time;
    const finalEndTime = body.end_time || currentBooking.end_time;
    const finalPartySize = body.party_size || currentBooking.party_size;

    const { tableId, status } = await findAvailableTable(
      supabase,
      currentBooking.business_id,
      finalDate,
      finalStartTime,
      finalEndTime,
      finalPartySize,
      body.booking_id // exclude current booking from conflict check
    );

    updateData.table_id = tableId;
    updateData.status = status;
    updateData.booking_date = finalDate;
    updateData.start_time = finalStartTime;
    updateData.end_time = finalEndTime;
    updateData.party_size = finalPartySize;
  }

  // Update booking
  const { data, error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", body.booking_id)
    .select()
    .single();

  if (error) {
    console.error('Booking update failed:', error);
    return {
      success: false,
      error: { 
        code: 'UPDATE_FAILED', 
        message: 'Unable to update booking. Please check your information and try again.' 
      }
    };
  }

  // Get table number if assigned
  let tableNumber = null;
  if (data.table_id) {
    const { data: table } = await supabase
      .from("tables")
      .select("table_number")
      .eq("id", data.table_id)
      .single();
    tableNumber = table?.table_number;
  }

  console.log("Booking updated:", { booking_id: body.booking_id, table_number: tableNumber });

  return {
    success: true,
    data: {
      booking_id: body.booking_id,
      table_number: tableNumber,
      status: data.status,
      message: "Reserva actualizada correctamente"
    }
  };
}

async function checkAvailability(supabase: any, body: z.infer<typeof CheckAvailabilitySchema>) {
  const { tableId, status } = await findAvailableTable(
    supabase,
    body.business_id,
    body.booking_date,
    body.start_time,
    body.end_time,
    body.party_size
  );

  let tableNumber = null;
  if (tableId) {
    const { data: table } = await supabase
      .from("tables")
      .select("table_number")
      .eq("id", tableId)
      .single();
    tableNumber = table?.table_number;
  }

  return {
    success: true,
    data: {
      available: status === "reserved",
      table_number: tableNumber,
      message: status === "reserved" 
        ? `Mesa ${tableNumber} disponible`
        : "No hay mesas disponibles para esa fecha y hora"
    }
  };
}

async function listBookings(supabase: any, body: z.infer<typeof ListBookingsSchema>) {
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      client_name,
      client_phone,
      booking_date,
      start_time,
      end_time,
      party_size,
      status,
      table_id,
      tables(table_number)
    `)
    .eq("business_id", body.business_id)
    .eq("booking_date", body.booking_date)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error listing bookings:", error);
    return {
      success: false,
      error: { code: "LIST_FAILED", message: "Unable to retrieve bookings. Please try again." }
    };
  }

  const formattedBookings = bookings.map((b: any) => ({
    booking_id: b.id,
    client_name: b.client_name,
    client_phone: b.client_phone,
    booking_date: b.booking_date,
    start_time: b.start_time,
    end_time: b.end_time,
    party_size: b.party_size,
    status: b.status,
    table_number: b.tables?.table_number || null
  }));

  return {
    success: true,
    data: {
      bookings: formattedBookings,
      count: formattedBookings.length
    }
  };
}

async function findAvailableTable(
  supabase: any,
  business_id: string,
  date: string,
  startTime: string,
  endTime: string,
  partySize: number,
  excludeBookingId?: string
): Promise<{ tableId: string | null; status: "reserved" | "pending" }> {
  try {
    // Get all tables for the business
    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("*")
      .eq("business_id", business_id)
      .order("max_capacity", { ascending: true });

    if (tablesError) throw tablesError;
    if (!tables || tables.length === 0) {
      return { tableId: null, status: "pending" };
    }

    // Get existing bookings that conflict with the time slot
    let query = supabase
      .from("bookings")
      .select("table_id")
      .eq("booking_date", date)
      .neq("status", "cancelled")
      .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

    if (excludeBookingId) {
      query = query.neq("id", excludeBookingId);
    }

    const { data: existingBookings, error: bookingsError } = await query;

    if (bookingsError) throw bookingsError;

    const occupiedTableIds = new Set(
      existingBookings?.map((b: any) => b.table_id) || []
    );

    // Try to find exact match first
    const exactMatch = tables.find(
      (t: any) => t.max_capacity === partySize && !occupiedTableIds.has(t.id)
    );

    if (exactMatch) {
      return { tableId: exactMatch.id, status: "reserved" };
    }

    // Find any available table with sufficient capacity
    const availableTable = tables.find(
      (t: any) => t.max_capacity >= partySize && !occupiedTableIds.has(t.id)
    );

    if (availableTable) {
      return { tableId: availableTable.id, status: "reserved" };
    }

    // No tables available
    return { tableId: null, status: "pending" };
  } catch (error) {
    console.error("Error finding available table:", error);
    throw error;
  }
}
