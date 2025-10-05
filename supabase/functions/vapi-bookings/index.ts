import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-vapi-secret",
};

interface VapiRequest {
  action: "create" | "cancel" | "update" | "check_availability" | "list";
  business_id?: string;
  booking_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  booking_date?: string;
  start_time?: string;
  end_time?: string;
  party_size?: number;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Vapi API Key
    const vapiSecret = req.headers.get("x-vapi-secret");
    const expectedSecret = Deno.env.get("VAPI_API_KEY");
    
    if (!vapiSecret || vapiSecret !== expectedSecret) {
      console.error("Invalid or missing Vapi API key");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: { code: "UNAUTHORIZED", message: "Invalid API key" } 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: VapiRequest = await req.json();
    console.log("Vapi request received:", { action: body.action, business_id: body.business_id });

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
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: "INVALID_ACTION", message: "Action not supported" }
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in vapi-bookings:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: error.message }
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createBooking(supabase: any, body: VapiRequest) {
  const { business_id, client_name, client_phone, client_email, booking_date, start_time, end_time, party_size, notes } = body;

  // Validate required fields
  if (!business_id || !client_name || !client_phone || !booking_date || !start_time || !end_time || !party_size) {
    return {
      success: false,
      error: { code: "MISSING_FIELDS", message: "Missing required fields" }
    };
  }

  // Verify business exists and is active
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", business_id)
    .eq("is_active", true)
    .single();

  if (businessError || !business) {
    return {
      success: false,
      error: { code: "BUSINESS_NOT_FOUND", message: "Business not found or inactive" }
    };
  }

  // Find available table
  const { tableId, status } = await findAvailableTable(
    supabase,
    business_id,
    booking_date,
    start_time,
    end_time,
    party_size
  );

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      business_id,
      table_id: tableId,
      client_name,
      client_phone,
      client_email: client_email || null,
      booking_date,
      start_time,
      end_time,
      party_size,
      notes: notes || null,
      status,
    })
    .select()
    .single();

  if (bookingError) {
    console.error("Error creating booking:", bookingError);
    return {
      success: false,
      error: { code: "CREATE_FAILED", message: bookingError.message }
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
      booking_date,
      start_time,
      end_time,
      party_size,
      message: status === "reserved" 
        ? `Reserva confirmada en mesa ${tableNumber}`
        : "Reserva en lista de espera - sin mesas disponibles"
    }
  };
}

async function cancelBooking(supabase: any, body: VapiRequest) {
  const { booking_id } = body;

  if (!booking_id) {
    return {
      success: false,
      error: { code: "MISSING_BOOKING_ID", message: "Booking ID is required" }
    };
  }

  // Update booking status to cancelled
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", booking_id)
    .select()
    .single();

  if (error) {
    console.error("Error cancelling booking:", error);
    return {
      success: false,
      error: { code: "CANCEL_FAILED", message: error.message }
    };
  }

  console.log("Booking cancelled:", booking_id);

  return {
    success: true,
    data: {
      booking_id,
      status: "cancelled",
      message: "Reserva cancelada correctamente"
    }
  };
}

async function updateBooking(supabase: any, body: VapiRequest) {
  const { booking_id, booking_date, start_time, end_time, party_size, notes, client_name, client_phone, client_email } = body;

  if (!booking_id) {
    return {
      success: false,
      error: { code: "MISSING_BOOKING_ID", message: "Booking ID is required" }
    };
  }

  // Get current booking
  const { data: currentBooking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", booking_id)
    .single();

  if (fetchError || !currentBooking) {
    return {
      success: false,
      error: { code: "BOOKING_NOT_FOUND", message: "Booking not found" }
    };
  }

  // Prepare update data
  const updateData: any = {};
  if (client_name) updateData.client_name = client_name;
  if (client_phone) updateData.client_phone = client_phone;
  if (client_email !== undefined) updateData.client_email = client_email || null;
  if (notes !== undefined) updateData.notes = notes || null;

  // If date/time/party_size changes, need to reassign table
  const needsReassignment = booking_date || start_time || end_time || party_size;

  if (needsReassignment) {
    const finalDate = booking_date || currentBooking.booking_date;
    const finalStartTime = start_time || currentBooking.start_time;
    const finalEndTime = end_time || currentBooking.end_time;
    const finalPartySize = party_size || currentBooking.party_size;

    const { tableId, status } = await findAvailableTable(
      supabase,
      currentBooking.business_id,
      finalDate,
      finalStartTime,
      finalEndTime,
      finalPartySize,
      booking_id // exclude current booking from conflict check
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
    .eq("id", booking_id)
    .select()
    .single();

  if (error) {
    console.error("Error updating booking:", error);
    return {
      success: false,
      error: { code: "UPDATE_FAILED", message: error.message }
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

  console.log("Booking updated:", { booking_id, table_number: tableNumber });

  return {
    success: true,
    data: {
      booking_id,
      table_number: tableNumber,
      status: data.status,
      message: "Reserva actualizada correctamente"
    }
  };
}

async function checkAvailability(supabase: any, body: VapiRequest) {
  const { business_id, booking_date, start_time, end_time, party_size } = body;

  if (!business_id || !booking_date || !start_time || !end_time || !party_size) {
    return {
      success: false,
      error: { code: "MISSING_FIELDS", message: "Missing required fields" }
    };
  }

  const { tableId, status } = await findAvailableTable(
    supabase,
    business_id,
    booking_date,
    start_time,
    end_time,
    party_size
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

async function listBookings(supabase: any, body: VapiRequest) {
  const { business_id, booking_date } = body;

  if (!business_id || !booking_date) {
    return {
      success: false,
      error: { code: "MISSING_FIELDS", message: "Business ID and date are required" }
    };
  }

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
    .eq("business_id", business_id)
    .eq("booking_date", booking_date)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error listing bookings:", error);
    return {
      success: false,
      error: { code: "LIST_FAILED", message: error.message }
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
    // Using < and > (not <= and >=) so end time is exclusive - allows back-to-back bookings
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
