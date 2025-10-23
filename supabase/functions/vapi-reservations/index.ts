import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
}

// Input validation schemas
const CreateBookingSchema = z.object({
  action: z.literal('create'),
  business_id: z.string().uuid(),
  client_name: z.string().trim().min(1).max(100),
  client_phone: z.string().trim().min(10).max(20).regex(/^[\d\s+()-]+$/),
  client_email: z.string().trim().email().max(255).optional(),
  party_size: z.number().int().min(1).max(50).optional(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
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
  notes: z.string().max(500).optional()
});

const CheckAvailabilitySchema = z.object({
  action: z.literal('check_availability'),
  business_id: z.string().uuid(),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  party_size: z.number().int().min(1).max(50).optional()
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Vapi Secret
    const vapiSecret = req.headers.get('x-vapi-secret')
    const expectedSecret = Deno.env.get('VAPI_SECRET')
    
    if (!expectedSecret || vapiSecret !== expectedSecret) {
      console.error('Unauthorized - Invalid Vapi Secret')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized' 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse and validate request body
    const rawBody = await req.json()
    console.log('Request action:', rawBody.action)
    
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const body = validationResult.data;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result

    switch (body.action) {
      case 'create':
        result = await createBooking(supabaseClient, body)
        break
      case 'cancel':
        result = await cancelBooking(supabaseClient, body)
        break
      case 'update':
        result = await updateBooking(supabaseClient, body)
        break
      case 'check_availability':
        result = await checkAvailability(supabaseClient, body)
        break
      case 'list':
        result = await listBookings(supabaseClient, body)
        break
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing your request',
        message: 'Please try again later or contact support'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// CREATE BOOKING
async function createBooking(supabase: any, data: z.infer<typeof CreateBookingSchema>) {
  console.log('Creating booking with data:', data)
  
  // Verify business exists
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('category')
    .eq('id', data.business_id)
    .single()

  if (businessError) {
    console.error('Business verification failed:', businessError)
    return {
      success: false,
      error: 'Business not found or inactive',
      message: 'Please check the business ID and try again'
    }
  }

  const isHospitality = business.category.toLowerCase() === 'restaurante' || business.category.toLowerCase() === 'bar'

  // For hospitality businesses, find available table
  let tableId = null
  if (isHospitality && data.party_size) {
    const { data: availableTable } = await supabase
      .from('tables')
      .select('id')
      .eq('business_id', data.business_id)
      .gte('max_capacity', data.party_size)
      .order('max_capacity', { ascending: true })
      .limit(1)
      .single()

    tableId = availableTable?.id || null
  }

  const bookingData: any = {
    business_id: data.business_id,
    client_name: data.client_name,
    client_phone: data.client_phone,
    client_email: data.client_email,
    booking_date: data.booking_date,
    start_time: data.start_time,
    end_time: data.end_time || data.start_time,
    party_size: data.party_size || null,
    notes: data.notes || '',
    status: 'reserved',
    table_id: tableId
  }

  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([bookingData])
    .select()
    .single()

  if (error) {
    console.error('Booking creation failed:', error)
    return {
      success: false,
      error: 'Unable to create booking',
      message: 'Please check your information and try again'
    }
  }

  console.log('Booking created:', booking)

  // Send confirmation email (non-blocking)
  if (booking?.id && data.client_email) {
    supabase.functions.invoke('send-booking-email', {
      body: { bookingId: booking.id }
    }).then(({ error: emailError }: { error: any }) => {
      if (emailError) {
        console.error('⚠️ Email notification failed:', emailError);
      } else {
        console.log('✅ Confirmation email sent to:', data.client_email);
      }
    }).catch((err: any) => {
      console.error('⚠️ Email service error:', err);
    });
  }

  return {
    success: true,
    message: `Reserva confirmada para ${data.client_name}`,
    data: {
      booking_id: booking.id,
      status: 'reserved',
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      party_size: booking.party_size,
      table_number: tableId ? 'Mesa asignada' : 'Sin mesa específica'
    }
  }
}

// CANCEL BOOKING
async function cancelBooking(supabase: any, data: z.infer<typeof CancelBookingSchema>) {
  console.log('Cancelling booking:', data.booking_id)
  
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', data.booking_id)

  if (error) {
    console.error('Booking cancellation failed:', error)
    return {
      success: false,
      error: 'Unable to cancel booking',
      message: 'Please try again or contact support'
    }
  }

  return {
    success: true,
    message: 'Reserva cancelada correctamente',
    data: { booking_id: data.booking_id, status: 'cancelled' }
  }
}

// UPDATE BOOKING
async function updateBooking(supabase: any, data: z.infer<typeof UpdateBookingSchema>) {
  console.log('Updating booking:', data.booking_id)
  
  const updates: any = {}
  if (data.booking_date) updates.booking_date = data.booking_date
  if (data.start_time) updates.start_time = data.start_time
  if (data.end_time) updates.end_time = data.end_time
  if (data.party_size) updates.party_size = data.party_size
  if (data.client_name) updates.client_name = data.client_name
  if (data.client_phone) updates.client_phone = data.client_phone
  if (data.client_email) updates.client_email = data.client_email
  if (data.notes !== undefined) updates.notes = data.notes

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', data.booking_id)
    .select()
    .single()

  if (error) {
    console.error('Booking update failed:', error)
    return {
      success: false,
      error: 'Unable to update booking',
      message: 'Please check your information and try again'
    }
  }

  return {
    success: true,
    message: 'Reserva actualizada',
    data: booking
  }
}

// CHECK AVAILABILITY
async function checkAvailability(supabase: any, data: z.infer<typeof CheckAvailabilitySchema>) {
  console.log('Checking availability for:', data)
  
  // Get business information
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('category')
    .eq('id', data.business_id)
    .single()

  if (businessError) {
    console.error('Business verification failed:', businessError)
    return {
      success: false,
      error: 'Business not found',
      message: 'Please check the business ID and try again'
    }
  }

  const isHospitality = business.category.toLowerCase() === 'restaurante' || business.category.toLowerCase() === 'bar'

  if (isHospitality) {
    // For restaurants/bars, check available tables
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('id, max_capacity')
      .eq('business_id', data.business_id)

    if (tablesError) {
      console.error('Tables query failed:', tablesError)
      return {
        success: false,
        error: 'Unable to check availability',
        message: 'Please try again later'
      }
    }

    const totalCapacity = tables?.reduce((sum: number, table: any) => sum + table.max_capacity, 0) || 0

    // Count active bookings for the date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('party_size')
      .eq('business_id', data.business_id)
      .eq('booking_date', data.booking_date)
      .in('status', ['reserved', 'confirmed'])

    if (bookingsError) {
      console.error('Bookings query failed:', bookingsError)
      return {
        success: false,
        error: 'Unable to check availability',
        message: 'Please try again later'
      }
    }

    const occupiedCapacity = bookings?.reduce((sum: number, booking: any) => sum + (booking.party_size || 0), 0) || 0
    const availableCapacity = totalCapacity - occupiedCapacity

    return {
      success: true,
      data: {
        available: availableCapacity > 0,
        available_capacity: availableCapacity,
        occupied_capacity: occupiedCapacity,
        total_capacity: totalCapacity,
        message: availableCapacity > 0 
          ? `Hay capacidad para ${availableCapacity} personas más` 
          : 'No hay disponibilidad para esta fecha'
      }
    }
  } else {
    // For other businesses, check available slots
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', data.business_id)
      .eq('booking_date', data.booking_date)
      .in('status', ['reserved', 'confirmed'])

    if (error) {
      console.error('Bookings query failed:', error)
      return {
        success: false,
        error: 'Unable to check availability',
        message: 'Please try again later'
      }
    }

    const MAX_BOOKINGS_PER_DAY = 10
    const occupied = bookings?.length || 0
    const available = MAX_BOOKINGS_PER_DAY - occupied

    return {
      success: true,
      data: {
        available: available > 0,
        available_slots: available,
        occupied_slots: occupied,
        message: available > 0 
          ? `Hay ${available} espacios disponibles` 
          : 'No hay disponibilidad para esta fecha'
      }
    }
  }
}

// LIST BOOKINGS
async function listBookings(supabase: any, data: z.infer<typeof ListBookingsSchema>) {
  console.log('Listing bookings for:', data)
  
  let query = supabase
    .from('bookings')
    .select(`
      *,
      tables (
        table_number,
        max_capacity
      )
    `)
    .eq('business_id', data.business_id)
    .neq('status', 'cancelled')
    .order('booking_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (data.booking_date) {
    query = query.eq('booking_date', data.booking_date)
  }

  const { data: bookings, error } = await query

  if (error) {
    console.error('Bookings query failed:', error)
    return {
      success: false,
      error: 'Unable to retrieve bookings',
      message: 'Please try again later'
    }
  }

  return {
    success: true,
    data: {
      bookings: bookings || [],
      count: bookings?.length || 0
    }
  }
}
