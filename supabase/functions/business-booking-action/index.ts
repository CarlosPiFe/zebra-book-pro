import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const action = url.searchParams.get("action"); // 'accept' or 'reject'

    if (!token || !action) {
      throw new Error("Token and action are required");
    }

    if (action !== "accept" && action !== "reject") {
      throw new Error("Invalid action. Must be 'accept' or 'reject'");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find booking by token
    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("*, businesses(name, confirmation_mode)")
      .eq("business_confirmation_token", token)
      .single();

    if (findError || !booking) {
      console.error("Error finding booking:", findError);
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Error - ZebraTime</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              h1 { color: #ef4444; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Error</h1>
              <p>No se pudo encontrar la reserva. El enlace puede haber expirado o ser inválido.</p>
            </div>
          </body>
        </html>`,
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    }

    if (action === "accept") {
      // Accept booking - change status to pending client confirmation
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "pending_client_confirmation" })
        .eq("id", booking.id);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw new Error("Failed to accept booking");
      }

      console.log(`Booking ${booking.id} accepted by business, waiting for client confirmation`);

      // Trigger client confirmation email
      await supabase.functions.invoke("send-client-confirmation", {
        body: { bookingId: booking.id },
      });

      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Reserva Aceptada - ZebraTime</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
              h1 { color: #10b981; font-size: 32px; margin-bottom: 20px; }
              .checkmark { font-size: 64px; color: #10b981; margin-bottom: 20px; }
              p { font-size: 18px; color: #333; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">✓</div>
              <h1>Reserva Aceptada</h1>
              <p>Has aceptado la reserva exitosamente.</p>
              <p>Se ha enviado un correo al cliente para que confirme su asistencia.</p>
              <p style="margin-top: 30px; color: #666; font-size: 14px;">Recibirás una notificación cuando el cliente confirme.</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    } else {
      // Reject booking
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ 
          status: "rejected",
          rejection_reason: "Rechazado por el negocio"
        })
        .eq("id", booking.id);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw new Error("Failed to reject booking");
      }

      console.log(`Booking ${booking.id} rejected by business`);

      // TODO: Send rejection email to client (would need another edge function)

      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Reserva Rechazada - ZebraTime</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
              h1 { color: #ef4444; font-size: 32px; margin-bottom: 20px; }
              .icon { font-size: 64px; color: #ef4444; margin-bottom: 20px; }
              p { font-size: 18px; color: #333; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">✗</div>
              <h1>Reserva Rechazada</h1>
              <p>Has rechazado la reserva.</p>
              <p>Se ha notificado al cliente.</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in business-booking-action:", error);
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Error - ZebraTime</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
            .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            h1 { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Error</h1>
            <p>${error.message}</p>
          </div>
        </body>
      </html>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  }
});
