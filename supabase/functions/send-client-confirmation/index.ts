import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendClientConfirmationRequest {
  bookingId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId }: SendClientConfirmationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        businesses (
          name,
          email,
          phone,
          address
        ),
        tables (
          table_number
        ),
        business_rooms (
          name
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Error fetching booking:", bookingError);
      throw new Error("Booking not found");
    }

    const business = booking.businesses;
    const confirmationUrl = `${supabaseUrl.replace('.supabase.co', '')}/confirm-booking?token=${booking.client_confirmation_token}`;

    // Format date and time
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const startTime = booking.start_time.substring(0, 5);
    const endTime = booking.end_time.substring(0, 5);

    // Build email HTML
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
            .booking-details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; color: #666; }
            .detail-value { color: #333; }
            .button { display: inline-block; background: #000000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; text-align: center; }
            .button:hover { background: #333333; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🦓 ZebraTime</h1>
              <p>Confirmación de Reserva</p>
            </div>
            <div class="content">
              <h2>¡Hola ${booking.client_name}!</h2>
              <p>Gracias por tu reserva en <strong>${business.name}</strong>.</p>
              <p>Para confirmar tu asistencia, por favor haz clic en el botón de abajo:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Negocio:</span>
                  <span class="detail-value">${business.name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Fecha:</span>
                  <span class="detail-value">${bookingDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Hora:</span>
                  <span class="detail-value">${startTime} - ${endTime}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Personas:</span>
                  <span class="detail-value">${booking.party_size}</span>
                </div>
                ${booking.tables ? `
                <div class="detail-row">
                  <span class="detail-label">Mesa:</span>
                  <span class="detail-value">#${booking.tables.table_number}</span>
                </div>
                ` : ''}
                ${booking.business_rooms ? `
                <div class="detail-row">
                  <span class="detail-label">Sala:</span>
                  <span class="detail-value">${booking.business_rooms.name}</span>
                </div>
                ` : ''}
              </div>

              <center>
                <a href="${confirmationUrl}" class="button">✓ Confirmar Reserva</a>
              </center>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <a href="${confirmationUrl}" style="color: #000; word-break: break-all;">${confirmationUrl}</a>
              </p>

              <p style="font-size: 14px; color: #999; margin-top: 20px;">
                Si no solicitaste esta reserva, puedes ignorar este correo.
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ZebraTime - Sistema de Gestión de Reservas</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const emailResponse = await resend.emails.send({
      from: "ZebraTime <onboarding@resend.dev>",
      to: [booking.client_email],
      subject: `Confirma tu reserva en ${business.name}`,
      html: htmlBody,
    });

    console.log("Client confirmation email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-client-confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
