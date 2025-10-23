import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingEmailRequest {
  bookingId: string;
}

async function getGmailAccessToken(refreshToken: string): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }
  
  return data.access_token;
}

async function sendGmail(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<void> {
  const email = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    htmlBody,
  ].join('\r\n');

  const encodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encodedEmail }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }
}

function formatTime(time: string): string {
  return time.substring(0, 5);
}

function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId }: BookingEmailRequest = await req.json();

    console.log('Fetching booking details for:', bookingId);

    // Obtener detalles de la reserva
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        businesses (
          name,
          address,
          phone,
          email
        ),
        tables (
          table_number,
          business_rooms (
            name
          )
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      throw new Error('Booking not found');
    }

    if (!booking.client_email) {
      console.log('No client email provided for booking:', bookingId);
      return new Response(
        JSON.stringify({ message: 'No email provided, skipping notification' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('Booking details:', {
      business: booking.businesses?.name,
      client: booking.client_email,
      date: booking.booking_date,
      time: booking.start_time
    });

    const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
    if (!refreshToken) {
      throw new Error('GMAIL_REFRESH_TOKEN not configured');
    }

    const accessToken = await getGmailAccessToken(refreshToken);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; width: 40%; color: #667eea; }
            .detail-value { width: 60%; }
            .status-badge { 
              display: inline-block; 
              padding: 8px 16px; 
              border-radius: 20px; 
              font-weight: bold;
              text-transform: uppercase;
              font-size: 12px;
            }
            .status-reserved { background: #10b981; color: white; }
            .status-pending { background: #f59e0b; color: white; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✓ Reserva Confirmada</h1>
              <p>Tu reserva ha sido procesada exitosamente</p>
            </div>
            <div class="content">
              <p>Estimado/a <strong>${booking.client_name}</strong>,</p>
              <p>Nos complace confirmar tu reserva en <strong>${booking.businesses?.name || 'nuestro establecimiento'}</strong>.</p>
              
              <div class="details">
                <h3 style="color: #667eea; margin-top: 0;">Detalles de la Reserva</h3>
                
                <div class="detail-row">
                  <span class="detail-label">📅 Fecha:</span>
                  <span class="detail-value">${formatDate(booking.booking_date)}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">🕐 Hora:</span>
                  <span class="detail-value">${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">👥 Personas:</span>
                  <span class="detail-value">${booking.party_size} ${booking.party_size === 1 ? 'persona' : 'personas'}</span>
                </div>
                
                ${booking.tables ? `
                <div class="detail-row">
                  <span class="detail-label">🪑 Mesa:</span>
                  <span class="detail-value">Mesa ${booking.tables.table_number}${booking.tables.business_rooms ? ` - ${booking.tables.business_rooms.name}` : ''}</span>
                </div>
                ` : ''}
                
                <div class="detail-row">
                  <span class="detail-label">📱 Teléfono:</span>
                  <span class="detail-value">${booking.client_phone}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Estado:</span>
                  <span class="detail-value">
                    <span class="status-badge status-${booking.status}">
                      ${booking.status === 'reserved' ? 'Confirmada' : booking.status === 'pending' ? 'Pendiente' : booking.status}
                    </span>
                  </span>
                </div>
                
                ${booking.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Notas:</span>
                  <span class="detail-value">${booking.notes}</span>
                </div>
                ` : ''}
              </div>
              
              ${booking.businesses?.address ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">📍 Ubicación</h3>
                <p>${booking.businesses.address}</p>
              </div>
              ` : ''}
              
              ${booking.businesses?.phone ? `
              <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <h3 style="color: #667eea; margin-top: 0;">📞 Contacto</h3>
                <p>Si necesitas modificar o cancelar tu reserva, contáctanos:</p>
                <p><strong>Teléfono:</strong> ${booking.businesses.phone}</p>
                ${booking.businesses.email ? `<p><strong>Email:</strong> ${booking.businesses.email}</p>` : ''}
              </div>
              ` : ''}
              
              <p style="margin-top: 30px;">¡Esperamos verte pronto!</p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>© ${new Date().getFullYear()} ${booking.businesses?.name || 'Reservas'}. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendGmail(
      accessToken,
      booking.client_email,
      `Confirmación de Reserva - ${booking.businesses?.name || 'Reserva'}`,
      emailHtml
    );

    console.log('Email sent successfully to:', booking.client_email);

    return new Response(
      JSON.stringify({ message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-booking-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
