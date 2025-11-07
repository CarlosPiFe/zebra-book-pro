import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY no está configurado');
    }

    console.log('Interpretando consulta:', query);

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano',
        input: [
          {
            role: 'system',
            content: 'Eres un parser que transforma texto libre en una búsqueda estructurada de restaurantes. Extrae la ubicación, tipo de cocina, rango de precio y palabras clave de la consulta del usuario. Si no se menciona algo, deja ese campo como null.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            json_schema: {
              name: 'RestaurantSearchQuery',
              schema: {
                type: 'object',
                properties: {
                  location: { type: 'string', nullable: true },
                  cuisine: { type: 'string', nullable: true },
                  priceRange: { type: 'string', nullable: true },
                  keywords: { type: 'string', nullable: true },
                },
                required: ['location', 'cuisine', 'priceRange', 'keywords'],
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Error de OpenAI:', response.status, errorData);
      throw new Error(`Error de OpenAI: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    // El resultado viene en data.output[0].content[0].text
    const parsed = JSON.parse(data.output[0].content[0].text);

    console.log('Consulta interpretada:', parsed);

    return new Response(
      JSON.stringify(parsed), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error en parse-search-query:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
