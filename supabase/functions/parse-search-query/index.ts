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
            content: `Eres un asistente experto que analiza búsquedas de restaurantes en lenguaje natural y las convierte en filtros estructurados.

FILTROS DISPONIBLES Y VALORES EXACTOS:

1. NOMBRE (name): Nombre específico del restaurante si se menciona.

2. UBICACIÓN (location): Ciudad, barrio, calle o zona geográfica.

3. TIPO DE COCINA (cuisine): Extrae EXACTAMENTE de esta lista (usa mayúsculas y acentos correctos):
   Africano, Alemán, Americano, Andaluz, Árabe, Argentino, Arrocería, Asador, Asiático, Asturiano, Belga, Brasileño, Canario, Castellano, Catalán, Chino, Colombiano, Coreano, Crepería, Cubano, De Fusión, Del Norte, Ecuatoriano, Español, Etíope, Francés, Gallego, Griego, Indio, Inglés, Internacional, Iraní, Italiano, Japonés, Latino, Libanés, Marisquería, Marroquí, Mediterráneo, Mexicano, Peruano, Portugués, Ruso, Suizo, Tailandés, Tradicional, Turco, Vasco, Vegetariano, Venezolano, Vietnamita

4. RANGO DE PRECIO (priceRange): Solo estos valores exactos: €, €€, €€€, €€€€
   - € = económico (hasta 15€)
   - €€ = moderado (15-30€)
   - €€€ = alto (30-60€)
   - €€€€ = premium (60€+)

5. VALORACIÓN MÍNIMA (minRating): Número entre 3.0 y 5.0
   - "buena valoración" = 4.0
   - "excelente valoración" = 4.5
   - "muy bien valorado" = 4.5

6. OPCIONES DIETÉTICAS (dietaryOptions): Extrae EXACTAMENTE de esta lista:
   Vegano, Vegetariano, Sin Gluten, Halal, Kosher

7. TIPOS DE SERVICIO (serviceTypes): Extrae EXACTAMENTE de esta lista:
   A la Carta, Menú del Día, Menú Degustación, Buffet Libre, Rodizio, Fast Food, Fast Casual, Gastrobar, Asador, Marisquería, Freiduría, Bar de Tapas, Coctelería, Cervecería, Vinoteca, Pub, Cafetería, Salón de Té, Bar, Brunch, Churrería, Chocolatería, Heladería, Pastelería, Crepería, Take Away, Delivery, Food Truck, Catering

8. ESPECIALIDADES DE PLATOS (dishSpecialties): Extrae EXACTAMENTE de esta lista:
   Aguacate, Arepas, Arroces, Bacalao, Burrito, Cachopo, Carnes, Ceviche, Chuletón, Cochinillo, Cocido, Cordero, Couscous, Croquetas, De cuchara, Fondue, Hamburguesas, Huevos Rotos, Marisco, Pad Thai, Paella, Pasta, Pescaíto frito, Pizza, Poke, Pulpo, Ramen, Risotto, Setas, Sushi, Tapas, Tartar, Tortilla, Wok

EJEMPLOS DE INTERPRETACIÓN:

- "pizza italiana barata" → cuisine: "Italiano", priceRange: "€", dishSpecialties: ["Pizza"]
- "sushi vegano en madrid" → location: "Madrid", dietaryOptions: ["Vegano"], dishSpecialties: ["Sushi"]
- "restaurante con menú del día y take away" → serviceTypes: ["Menú del Día", "Take Away"]
- "paella cerca de mí, bien valorado" → dishSpecialties: ["Paella"], minRating: 4.0
- "japonés caro con buena valoración" → cuisine: "Japonés", priceRange: "€€€€", minRating: 4.0
- "cocina vegana" → dietaryOptions: ["Vegano"]
- "comida sin gluten" → dietaryOptions: ["Sin Gluten"]
- "buffet libre chino" → serviceTypes: ["Buffet Libre"], cuisine: "Chino"

REGLAS IMPORTANTES:
- Si no se menciona un campo, usa null
- Usa EXACTAMENTE los valores de las listas (respeta mayúsculas y acentos)
- Para arrays vacíos, usa null (no [])
- Prioriza la búsqueda por tipo de cocina si se menciona un plato típico (ej: "sushi" → cuisine: "Japonés")
- Responde SOLO con JSON válido, sin texto adicional`,
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
