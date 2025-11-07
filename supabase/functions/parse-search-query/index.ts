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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: 'Eres un parser que transforma texto libre en una búsqueda estructurada de restaurantes. Extrae: nombre del restaurante (si se menciona un nombre específico), ubicación (ciudad, barrio, dirección), tipo de cocina, rango de precio (€, €€, €€€, €€€€), valoración mínima (número del 3 al 5), palabras clave generales, opciones dietéticas (vegano, vegetariano, sin gluten, halal, kosher), tipos de servicio (menú del día, buffet, take away, delivery, a la carta, etc.) y especialidades de platos (sushi, pizza, pasta, paella, etc.). Si no se menciona algo, deja ese campo como null. Para valoración, si dicen "buena valoración" usa 4, "excelente" usa 4.5. Para precio, usa el formato de euros. Responde SOLO con JSON válido.',
          },
          {
            role: 'user',
            content: query,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'RestaurantSearchQuery',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                name: { type: ['string', 'null'] },
                location: { type: ['string', 'null'] },
                cuisine: { type: ['string', 'null'] },
                priceRange: { type: ['string', 'null'] },
                minRating: { type: ['number', 'null'] },
                keywords: { type: ['string', 'null'] },
                dietaryOptions: { 
                  type: ['array', 'null'],
                  items: { type: 'string' }
                },
                serviceTypes: { 
                  type: ['array', 'null'],
                  items: { type: 'string' }
                },
                dishSpecialties: { 
                  type: ['array', 'null'],
                  items: { type: 'string' }
                },
              },
              required: ['name', 'location', 'cuisine', 'priceRange', 'minRating', 'keywords', 'dietaryOptions', 'serviceTypes', 'dishSpecialties'],
              additionalProperties: false,
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
    
    // Parsear el JSON del contenido del mensaje
    const parsed = JSON.parse(data.choices[0].message.content);

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
