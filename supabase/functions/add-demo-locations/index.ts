import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Ubicaciones aproximadas de restaurantes populares en Madrid y otras ciudades españolas
const DEMO_LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Madrid centro
  'madrid-1': { lat: 40.4168, lng: -3.7038 },
  'madrid-2': { lat: 40.4200, lng: -3.7050 },
  'madrid-3': { lat: 40.4180, lng: -3.7100 },
  'madrid-4': { lat: 40.4215, lng: -3.7025 },
  'madrid-5': { lat: 40.4155, lng: -3.7080 },
  'madrid-6': { lat: 40.4195, lng: -3.6990 },
  'madrid-7': { lat: 40.4140, lng: -3.7110 },
  'madrid-8': { lat: 40.4225, lng: -3.7045 },
  'madrid-9': { lat: 40.4160, lng: -3.7020 },
  'madrid-10': { lat: 40.4205, lng: -3.7060 },
  // Barcelona
  'barcelona-1': { lat: 41.3851, lng: 2.1734 },
  'barcelona-2': { lat: 41.3879, lng: 2.1699 },
  'barcelona-3': { lat: 41.3825, lng: 2.1769 },
  'barcelona-4': { lat: 41.3890, lng: 2.1755 },
  'barcelona-5': { lat: 41.3830, lng: 2.1710 },
  // Valencia
  'valencia-1': { lat: 39.4699, lng: -0.3763 },
  'valencia-2': { lat: 39.4720, lng: -0.3780 },
  // Sevilla
  'sevilla-1': { lat: 37.3891, lng: -5.9845 },
  'sevilla-2': { lat: 37.3910, lng: -5.9920 },
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching businesses without location...');

    // Obtener todos los negocios que no tienen coordenadas
    const { data: businesses, error: fetchError } = await supabase
      .from('businesses')
      .select('id, name, address')
      .or('latitude.is.null,longitude.is.null');

    if (fetchError) throw fetchError;

    console.log(`Found ${businesses?.length || 0} businesses without location`);

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No businesses need location updates', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Asignar ubicaciones a los negocios
    const locationKeys = Object.keys(DEMO_LOCATIONS);
    let updateCount = 0;

    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const locationKey = locationKeys[i % locationKeys.length]; // Rotar ubicaciones
      const location = DEMO_LOCATIONS[locationKey];

      // Añadir algo de variación aleatoria (±0.005 grados ≈ 500m)
      const randomLat = location.lat + (Math.random() - 0.5) * 0.01;
      const randomLng = location.lng + (Math.random() - 0.5) * 0.01;

      console.log(`Updating business ${business.name} with location:`, { lat: randomLat, lng: randomLng });

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          latitude: randomLat,
          longitude: randomLng,
        })
        .eq('id', business.id);

      if (updateError) {
        console.error(`Error updating business ${business.id}:`, updateError);
      } else {
        updateCount++;
      }
    }

    console.log(`Successfully updated ${updateCount} businesses`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully added locations to ${updateCount} businesses`,
        updated: updateCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in add-demo-locations:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
