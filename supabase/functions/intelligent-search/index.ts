import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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

    console.log('🔍 Búsqueda inteligente iniciada:', query);

    // Paso 1: Obtener TODOS los restaurantes activos con sus datos completos
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: businesses, error: dbError } = await supabase
      .from('businesses')
      .select(`
        id,
        name,
        description,
        address,
        cuisine_type,
        price_range,
        average_rating,
        seo_keywords,
        dietary_options,
        service_types,
        dish_specialties,
        special_offer
      `)
      .eq('is_active', true);

    if (dbError) {
      console.error('Error obteniendo restaurantes:', dbError);
      throw new Error('Error al obtener restaurantes de la base de datos');
    }

    console.log(`📊 ${businesses.length} restaurantes cargados para análisis`);

    // Paso 2: Construir contexto completo para la IA
    const restaurantContext = businesses.map(b => ({
      id: b.id,
      name: b.name,
      cuisine: b.cuisine_type,
      price: b.price_range,
      rating: b.average_rating,
      description: b.description,
      address: b.address,
      seo: b.seo_keywords,
      diets: b.dietary_options,
      services: b.service_types,
      dishes: b.dish_specialties,
      offer: b.special_offer
    }));

    const availableFilters = {
      cuisines: ["Africano", "Alemán", "Americano", "Andaluz", "Árabe", "Argentino", "Arrocería", "Asador", "Asiático", "Asturiano", "Belga", "Brasileño", "Canario", "Castellano", "Catalán", "Chino", "Colombiano", "Coreano", "Crepería", "Cubano", "De Fusión", "Del Norte", "Ecuatoriano", "Español", "Etíope", "Francés", "Gallego", "Griego", "Indio", "Inglés", "Internacional", "Iraní", "Italiano", "Japonés", "Latino", "Libanés", "Marisquería", "Marroquí", "Mediterráneo", "Mexicano", "Peruano", "Portugués", "Ruso", "Suizo", "Tailandés", "Tradicional", "Turco", "Vasco", "Vegetariano", "Venezolano", "Vietnamita"],
      prices: ["€", "€€", "€€€", "€€€€"],
      diets: ["Vegano", "Vegetariano", "Sin Gluten", "Halal", "Kosher"],
      services: ["A la Carta", "Menú del Día", "Menú Degustación", "Buffet Libre", "Rodizio", "Fast Food", "Fast Casual", "Gastrobar", "Asador", "Marisquería", "Freiduría", "Bar de Tapas", "Coctelería", "Cervecería", "Vinoteca", "Pub", "Cafetería", "Salón de Té", "Bar", "Brunch", "Churrería", "Chocolatería", "Heladería", "Pastelería", "Crepería", "Take Away", "Delivery", "Food Truck", "Catering"],
      dishes: ["Aguacate", "Arepas", "Arroces", "Bacalao", "Burrito", "Cachopo", "Carnes", "Ceviche", "Chuletón", "Cochinillo", "Cocido", "Cordero", "Couscous", "Croquetas", "De cuchara", "Fondue", "Hamburguesas", "Huevos Rotos", "Marisco", "Pad Thai", "Paella", "Pasta", "Pescaíto frito", "Pizza", "Poke", "Pulpo", "Ramen", "Risotto", "Setas", "Sushi", "Tapas", "Tartar", "Tortilla", "Wok"]
    };

    // Paso 3: Llamar a GPT-5 con contexto completo (MODO API PRIORITARIO)
    const systemPrompt = `Eres un experto asistente de búsqueda de restaurantes con acceso COMPLETO a la base de datos.

🎯 TU MISIÓN: Analizar la consulta del usuario y devolver los restaurantes más relevantes con explicación.

📊 CONTEXTO DISPONIBLE:
- Base de datos completa: ${businesses.length} restaurantes activos
- Cada restaurante tiene: nombre, cocina, precio, rating, descripción, dirección, palabras clave SEO, opciones dietéticas, servicios, platos especiales, ofertas

🔍 PROCESO DE BÚSQUEDA (MULTI-PASO):

PASO 1: INTERPRETAR LA CONSULTA
- Extraer intención del usuario (ubicación, tipo de cocina, precio, ambiente, ocasión, platos específicos, etc.)
- Identificar filtros explícitos e implícitos
- Detectar keywords semánticas (ej: "romántico", "familiar", "terraza", "vistas")

PASO 2: APLICAR FILTROS PROGRESIVOS
1. Filtros duros (MUST HAVE):
   - Ubicación explícita
   - Tipo de cocina específica
   - Opciones dietéticas críticas (vegano, sin gluten, etc.)
   - Rango de precio
   
2. Filtros suaves (NICE TO HAVE):
   - Rating mínimo sugerido (default: 3.5+)
   - Platos específicos
   - Servicios (delivery, menú del día, etc.)
   - Keywords de ambiente/ocasión

3. Búsqueda semántica:
   - Buscar en description, seo_keywords, address
   - Sinónimos y variaciones
   - Contexto de la consulta

PASO 3: VALIDAR Y RANKEAR RESULTADOS
- Verificar que cada resultado cumple los criterios
- Calcular score de relevancia (0-100)
- Ordenar por: score de relevancia > rating > nombre
- Explicar POR QUÉ cada restaurante es relevante

PASO 4: GENERAR RESPUESTA ESTRUCTURADA
{
  "matches": [
    {
      "id": "uuid",
      "name": "Nombre del restaurante",
      "relevanceScore": 95,
      "matchReasons": ["Tiene paella en su menú", "Ubicado en zona solicitada", "Rating excelente 4.8"],
      "cuisine": "Mediterráneo",
      "price": "€€",
      "rating": 4.8
    }
  ],
  "appliedFilters": {
    "location": "Madrid Centro",
    "cuisine": "Mediterráneo",
    "dishes": ["Paella"],
    "minRating": 4.0,
    "keywords": "terraza vistas"
  },
  "searchStrategy": "Filtrado por ubicación + tipo de cocina + platos específicos + keywords de ambiente",
  "totalMatches": 3
}

⚠️ REGLAS CRÍTICAS:
1. Si NO hay resultados con filtros duros, relaja SOLO los filtros suaves
2. SIEMPRE explica por qué cada restaurante es relevante
3. MÁXIMO 10 resultados (los más relevantes)
4. Si la consulta es ambigua, interpreta con contexto razonable
5. Prioriza calidad sobre cantidad
6. Si hay keywords semánticas, búscalas en description, seo_keywords y address
7. Considera sinónimos (ej: "barato" = "€", "caro" = "€€€", "veggie" = "Vegetariano")

📋 FILTROS DISPONIBLES:
${JSON.stringify(availableFilters, null, 2)}

🏪 BASE DE DATOS COMPLETA (${businesses.length} restaurantes):
${JSON.stringify(restaurantContext, null, 2)}`;

    console.log('🤖 Llamando a GPT-5 con contexto completo...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-nano', 
            service_tier="priority"

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Búsqueda del usuario: "${query}"` }
        ],
        max_completion_tokens: 4000, // Mayor capacidad para análisis completo
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'IntelligentSearchResponse',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                matches: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      relevanceScore: { type: 'number' },
                      matchReasons: {
                        type: 'array',
                        items: { type: 'string' }
                      },
                      cuisine: { type: ['string', 'null'] },
                      price: { type: ['string', 'null'] },
                      rating: { type: ['number', 'null'] }
                    },
                    required: ['id', 'name', 'relevanceScore', 'matchReasons'],
                    additionalProperties: false
                  }
                },
                appliedFilters: {
                  type: 'object',
                  properties: {
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
                    }
                  },
                  required: ['location', 'cuisine', 'priceRange', 'minRating', 'keywords', 'dietaryOptions', 'serviceTypes', 'dishSpecialties'],
                  additionalProperties: false
                },
                searchStrategy: { type: 'string' },
                totalMatches: { type: 'number' }
              },
              required: ['matches', 'appliedFilters', 'searchStrategy', 'totalMatches'],
              additionalProperties: false
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Error de OpenAI:', response.status, errorData);
      throw new Error(`Error de OpenAI: ${response.status}`);
    }

    const aiResponse = await response.json();
    const result = JSON.parse(aiResponse.choices[0].message.content);

    console.log(`✅ Búsqueda completada: ${result.totalMatches} resultados encontrados`);
    console.log(`📊 Estrategia aplicada: ${result.searchStrategy}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 Error en intelligent-search:', error);
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
