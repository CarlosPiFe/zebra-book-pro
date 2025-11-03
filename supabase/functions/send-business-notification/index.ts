import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendBusinessNotificationRequest {
  bookingId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId }: SendBusinessNotificationRequest = await req.json();

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
    const acceptUrl = `${supabaseUrl.replace('.supabase.co', '')}/business-booking-action?token=${booking.business_confirmation_token}&action=accept`;
    const rejectUrl = `${supabaseUrl.replace('.supabase.co', '')}/business-booking-action?token=${booking.business_confirmation_token}&action=reject`;

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
            .button-container { display: flex; gap: 15px; justify-content: center; margin: 20px 0; }
            .button { display: inline-block; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; text-align: center; }
            .button-accept { background: #10b981; color: white; }
            .button-accept:hover { background: #059669; }
            .button-reject { background: #ef4444; color: white; }
            .button-reject:hover { background: #dc2626; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🦓 ZebraTime</h1>
              <p>Nueva Solicitud de Reserva</p>
            </div>
            <div class="content">
              <h2>Nueva Reserva Pendiente</h2>
              <p>Has recibido una nueva solicitud de reserva que requiere tu confirmación:</p>
              
              <div class="booking-details">
                <div class="detail-row">
                  <span class="detail-label">Cliente:</span>
                  <span class="detail-value">${booking.client_name}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Email:</span>
                  <span class="detail-value">${booking.client_email}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Teléfono:</span>
                  <span class="detail-value">${booking.client_phone}</span>
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
                ${booking.notes ? `
                <div class="detail-row">
                  <span class="detail-label">Notas:</span>
                  <span class="detail-value">${booking.notes}</span>
                </div>
                ` : ''}
              </div>

              <center>
                <div class="button-container">
                  <a href="${acceptUrl}" class="button button-accept">✓ Aceptar Reserva</a>
                  <a href="${rejectUrl}" class="button button-reject">✗ Rechazar Reserva</a>
                </div>
              </center>

              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Si no puedes hacer clic en los botones, copia y pega estos enlaces en tu navegador:<br>
                <strong>Aceptar:</strong> <a href="${acceptUrl}" style="color: #10b981; word-break: break-all;">${acceptUrl}</a><br>
                <strong>Rechazar:</strong> <a href="${rejectUrl}" style="color: #ef4444; word-break: break-all;">${rejectUrl}</a>
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
      to: [business.email],
      subject: `Nueva solicitud de reserva - ${booking.client_name}`,
      html: htmlBody,
    });

    console.log("Business notification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-business-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
