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

    if (!token) {
      throw new Error("Token is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find booking by token
    const { data: booking, error: findError } = await supabase
      .from("bookings")
      .select("*, businesses(name)")
      .eq("client_confirmation_token", token)
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

    // Check if already confirmed
    if (booking.status === "confirmed") {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Ya Confirmada - ZebraTime</title>
            <style>
              body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
              .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              h1 { color: #10b981; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Reserva Ya Confirmada</h1>
              <p>Esta reserva ya fue confirmada previamente en <strong>${booking.businesses.name}</strong>.</p>
              <p>¡Te esperamos!</p>
            </div>
          </body>
        </html>`,
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/html" },
        }
      );
    }

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Error updating booking:", updateError);
      throw new Error("Failed to confirm booking");
    }

    console.log(`Booking ${booking.id} confirmed by client`);

    // Return success page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reserva Confirmada - ZebraTime</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
            .container { text-align: center; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; }
            h1 { color: #10b981; font-size: 32px; margin-bottom: 20px; }
            .checkmark { font-size: 64px; color: #10b981; margin-bottom: 20px; }
            p { font-size: 18px; color: #333; margin: 10px 0; }
            .business-name { font-weight: bold; color: #000; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="checkmark">✓</div>
            <h1>¡Reserva Confirmada!</h1>
            <p>Tu reserva en <span class="business-name">${booking.businesses.name}</span> ha sido confirmada exitosamente.</p>
            <p>Recibirás más detalles por correo electrónico.</p>
            <p style="margin-top: 30px; color: #666; font-size: 14px;">¡Te esperamos!</p>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  } catch (error: any) {
    console.error("Error in confirm-client-booking:", error);
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
