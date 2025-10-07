import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar Vapi Secret
    const vapiSecret = req.headers.get('x-vapi-secret')
    const expectedSecret = Deno.env.get('VAPI_SECRET')
    
    if (!expectedSecret || vapiSecret !== expectedSecret) {
      console.error('Unauthorized - Invalid Vapi Secret')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized - Invalid Vapi Secret' 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    const body = await req.json()
    console.log('Request body:', body)
    const { action } = body

    // Crear cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let result

    switch (action) {
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
      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
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
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// CREATE BOOKING
async function createBooking(supabase: any, data: any) {
  console.log('Creating booking with data:', data)
  
  // Verificar que el negocio existe
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('category')
    .eq('id', data.business_id)
    .single()

  if (businessError) {
    throw new Error('Negocio no encontrado')
  }

  const isHospitality = business.category.toLowerCase() === 'restaurante' || business.category.toLowerCase() === 'bar'

  // Para negocios de hospitalidad, buscar mesa disponible
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
    console.error('Error creating booking:', error)
    throw error
  }

  console.log('Booking created:', booking)

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
async function cancelBooking(supabase: any, data: any) {
  console.log('Cancelling booking:', data.booking_id)
  
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', data.booking_id)

  if (error) {
    console.error('Error cancelling booking:', error)
    throw error
  }

  return {
    success: true,
    message: 'Reserva cancelada correctamente',
    data: { booking_id: data.booking_id, status: 'cancelled' }
  }
}

// UPDATE BOOKING
async function updateBooking(supabase: any, data: any) {
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
    console.error('Error updating booking:', error)
    throw error
  }

  return {
    success: true,
    message: 'Reserva actualizada',
    data: booking
  }
}

// CHECK AVAILABILITY
async function checkAvailability(supabase: any, data: any) {
  console.log('Checking availability for:', data)
  
  // Obtener información del negocio
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('category')
    .eq('id', data.business_id)
    .single()

  if (businessError) {
    throw new Error('Negocio no encontrado')
  }

  const isHospitality = business.category.toLowerCase() === 'restaurante' || business.category.toLowerCase() === 'bar'

  if (isHospitality) {
    // Para restaurantes/bares, verificar mesas disponibles
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('id, max_capacity')
      .eq('business_id', data.business_id)

    if (tablesError) throw tablesError

    const totalCapacity = tables?.reduce((sum: number, table: any) => sum + table.max_capacity, 0) || 0

    // Contar reservas activas para la fecha
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('party_size')
      .eq('business_id', data.business_id)
      .eq('booking_date', data.booking_date)
      .in('status', ['reserved', 'confirmed'])

    if (bookingsError) throw bookingsError

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
    // Para otros negocios, verificar slots disponibles
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', data.business_id)
      .eq('booking_date', data.booking_date)
      .in('status', ['reserved', 'confirmed'])

    if (error) throw error

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
async function listBookings(supabase: any, data: any) {
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
    console.error('Error listing bookings:', error)
    throw error
  }

  return {
    success: true,
    data: {
      bookings: bookings || [],
      count: bookings?.length || 0
    }
  }
}
