import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-secret',
};

// Basic validation schema - adjust based on expected n8n payload
const N8nWebhookSchema = z.object({
  // Add expected fields from n8n here
  // For now, accepting any object but validating it's an object
}).passthrough(); // Allow additional fields

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify n8n secret (optional but recommended)
    const n8nSecret = req.headers.get('x-n8n-secret');
    const expectedSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    
    // If secret is configured, verify it
    if (expectedSecret && n8nSecret !== expectedSecret) {
      console.error('Unauthorized - Invalid n8n secret');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized' 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('N8N webhook triggered');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate incoming data from n8n
    const rawData = await req.json();
    
    const validationResult = N8nWebhookSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Invalid request data',
          message: 'Please check your payload format'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const requestData = validationResult.data;
    console.log('Validated webhook data received');

    // Process the data here as needed
    // For now, just echoing back with a timestamp
    const responseData = {
      success: true,
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString(),
    };

    console.log('Sending response');

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error processing n8n webhook:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred processing the webhook',
        message: 'Please try again or contact support'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
