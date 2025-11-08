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
            content: `Eres un asistente experto que analiza búsquedas de restaurantes en lenguaje natural y las convierte en filtros estructurados. DEBES EXTRAER TODOS LOS FILTROS MENCIONADOS, INCLUSO SI HAY MÚLTIPLES.

=== FILTROS DISPONIBLES Y VALORES EXACTOS ===

1. NOMBRE (name): Nombre específico del restaurante si se menciona explícitamente.

2. UBICACIÓN (location): Ciudad, barrio, calle, zona geográfica o referencia de ubicación.

3. TIPOS DE COCINA (cuisine): String único del tipo principal. Extrae EXACTAMENTE de esta lista:
   Africano, Alemán, Americano, Andaluz, Árabe, Argentino, Arrocería, Asador, Asiático, Asturiano, Belga, Brasileño, Canario, Castellano, Catalán, Chino, Colombiano, Coreano, Crepería, Cubano, De Fusión, Del Norte, Ecuatoriano, Español, Etíope, Francés, Gallego, Griego, Indio, Inglés, Internacional, Iraní, Italiano, Japonés, Latino, Libanés, Marisquería, Marroquí, Mediterráneo, Mexicano, Peruano, Portugués, Ruso, Suizo, Tailandés, Tradicional, Turco, Vasco, Vegetariano, Venezolano, Vietnamita

4. RANGO DE PRECIO (priceRange): Solo UN valor de: €, €€, €€€, €€€€
   - € = económico (hasta 15€) → "barato", "económico", "low cost"
   - €€ = moderado (15-30€) → "normal", "moderado", "precio medio"
   - €€€ = alto (30-60€) → "caro", "premium", "exclusivo"  
   - €€€€ = muy alto (60€+) → "muy caro", "lujo", "alta cocina"

5. VALORACIÓN MÍNIMA (minRating): Número entre 3.0 y 5.0
   - "buena valoración" / "recomendado" = 4.0
   - "excelente" / "muy bien valorado" = 4.5
   - "mejor valorado" / "top" = 4.8

6. OPCIONES DIETÉTICAS (dietaryOptions): Array con TODOS los mencionados:
   Vegano, Vegetariano, Sin Gluten, Halal, Kosher
   
   Mapeo de sinónimos:
   - "vegano", "vegan", "plant based" → Vegano
   - "vegetariano", "veggie" → Vegetariano
   - "sin gluten", "celíaco", "gluten free" → Sin Gluten
   - "halal" → Halal
   - "kosher" → Kosher

7. TIPOS DE SERVICIO (serviceTypes): Array con TODOS los mencionados:
   A la Carta, Menú del Día, Menú Degustación, Buffet Libre, Rodizio, Fast Food, Fast Casual, Gastrobar, Asador, Marisquería, Freiduría, Bar de Tapas, Coctelería, Cervecería, Vinoteca, Pub, Cafetería, Salón de Té, Bar, Brunch, Churrería, Chocolatería, Heladería, Pastelería, Crepería, Take Away, Delivery, Food Truck, Catering
   
   Mapeo de sinónimos:
   - "menú del día", "menú diario" → Menú del Día
   - "take away", "para llevar", "takeaway" → Take Away
   - "delivery", "a domicilio", "reparto" → Delivery
   - "buffet", "buffet libre" → Buffet Libre
   - "tapas", "bar de tapas" → Bar de Tapas

8. ESPECIALIDADES DE PLATOS (dishSpecialties): Array con TODOS los mencionados:
   Aguacate, Arepas, Arroces, Bacalao, Burrito, Cachopo, Carnes, Ceviche, Chuletón, Cochinillo, Cocido, Cordero, Couscous, Croquetas, De cuchara, Fondue, Hamburguesas, Huevos Rotos, Marisco, Pad Thai, Paella, Pasta, Pescaíto frito, Pizza, Poke, Pulpo, Ramen, Risotto, Setas, Sushi, Tapas, Tartar, Tortilla, Wok
   
   Mapeo de sinónimos:
   - "sushi", "makis", "nigiris" → Sushi
   - "pizza", "pizzas" → Pizza
   - "pasta", "pastas" → Pasta
   - "hamburguesa", "burger" → Hamburguesas
   - "ramen", "noodles japoneses" → Ramen

=== EJEMPLOS CON MÚLTIPLES FILTROS ===

Entrada: "pizza italiana barata con opción vegana"
Salida: {
  cuisine: "Italiano",
  priceRange: "€",
  dishSpecialties: ["Pizza"],
  dietaryOptions: ["Vegano"]
}

Entrada: "sushi vegano y sin gluten en madrid, bien valorado"
Salida: {
  location: "Madrid",
  dietaryOptions: ["Vegano", "Sin Gluten"],
  dishSpecialties: ["Sushi"],
  minRating: 4.0
}

Entrada: "restaurante con menú del día, take away y delivery en barcelona"
Salida: {
  location: "Barcelona",
  serviceTypes: ["Menú del Día", "Take Away", "Delivery"]
}

Entrada: "paella y tapas cerca de mí, excelente valoración"
Salida: {
  dishSpecialties: ["Paella", "Tapas"],
  minRating: 4.5
}

Entrada: "japonés caro con sushi y ramen, opciones vegetarianas"
Salida: {
  cuisine: "Japonés",
  priceRange: "€€€",
  dishSpecialties: ["Sushi", "Ramen"],
  dietaryOptions: ["Vegetariano"]
}

Entrada: "cocina vegana sin gluten con delivery"
Salida: {
  dietaryOptions: ["Vegano", "Sin Gluten"],
  serviceTypes: ["Delivery"]
}

Entrada: "buffet libre chino barato con menú del día"
Salida: {
  serviceTypes: ["Buffet Libre", "Menú del Día"],
  cuisine: "Chino",
  priceRange: "€"
}

Entrada: "italiano con pizza, pasta y risotto, take away"
Salida: {
  cuisine: "Italiano",
  dishSpecialties: ["Pizza", "Pasta", "Risotto"],
  serviceTypes: ["Take Away"]
}

=== REGLAS CRÍTICAS ===

1. EXTRAE TODOS LOS FILTROS mencionados, no solo el primero
2. Si un array puede tener múltiples valores, INCLÚYELOS TODOS
3. Usa null solo cuando NO se menciona nada relacionado con ese filtro
4. Usa EXACTAMENTE los valores de las listas (respeta mayúsculas y acentos)
5. Si se mencionan sinónimos, mapea al valor correcto de la lista
6. Si se mencionan platos típicos de una cocina, infiere el tipo de cocina también
7. Responde SOLO con JSON válido, sin texto adicional
8. Para arrays: si hay 1+ valores → array con esos valores, si no se menciona → null (nunca [])`,
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
