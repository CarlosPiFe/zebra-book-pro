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

// Función Haversine para calcular distancia entre dos coordenadas
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userLocation } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY no está configurado');
    }

    console.log('🔍 Búsqueda inteligente iniciada:', query);
    console.log('📍 Ubicación del usuario:', userLocation);

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
        special_offer,
        latitude,
        longitude
      `)
      .eq('is_active', true);

    if (dbError) {
      console.error('Error obteniendo restaurantes:', dbError);
      throw new Error('Error al obtener restaurantes de la base de datos');
    }

    console.log(`📊 ${businesses.length} restaurantes cargados para análisis`);

    // Calcular distancias si hay ubicación del usuario
    let businessesWithDistance = businesses.map(b => ({
      ...b,
      distance: userLocation && b.latitude && b.longitude
        ? calculateDistance(userLocation.lat, userLocation.lng, b.latitude, b.longitude)
        : null
    }));

    // Filtrar restaurantes demasiado lejos (opcional: más de 50km)
    if (userLocation) {
      businessesWithDistance = businessesWithDistance.filter(b => 
        !b.distance || b.distance <= 50
      );
      // Ordenar por distancia
      businessesWithDistance.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    // Paso 2: Construir contexto completo para la IA
    const restaurantContext = businessesWithDistance.map(b => ({
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
      offer: b.special_offer,
      distance: b.distance ? `${b.distance.toFixed(1)} km` : null
    }));

    const availableFilters = {
      cuisines: ["Africano", "Alemán", "Americano", "Andaluz", "Árabe", "Argentino", "Arrocería", "Asador", "Asiático", "Asturiano", "Belga", "Brasileño", "Canario", "Castellano", "Catalán", "Chino", "Colombiano", "Coreano", "Crepería", "Cubano", "De Fusión", "Del Norte", "Ecuatoriano", "Español", "Etíope", "Francés", "Gallego", "Griego", "Indio", "Inglés", "Internacional", "Iraní", "Italiano", "Japonés", "Latino", "Libanés", "Marisquería", "Marroquí", "Mediterráneo", "Mexicano", "Peruano", "Portugués", "Ruso", "Suizo", "Tailandés", "Tradicional", "Turco", "Vasco", "Vegetariano", "Venezolano", "Vietnamita"],
      prices: ["€", "€€", "€€€", "€€€€"],
      diets: ["Vegano", "Vegetariano", "Sin Gluten", "Halal", "Kosher"],
      services: ["A la Carta", "Menú del Día", "Menú Degustación", "Buffet Libre", "Rodizio", "Fast Food", "Fast Casual", "Gastrobar", "Asador", "Marisquería", "Freiduría", "Bar de Tapas", "Coctelería", "Cervecería", "Vinoteca", "Pub", "Cafetería", "Salón de Té", "Bar", "Brunch", "Churrería", "Chocolatería", "Heladería", "Pastelería", "Crepería", "Take Away", "Delivery", "Food Truck", "Catering"],
      dishes: ["Aguacate", "Arepas", "Arroces", "Bacalao", "Burrito", "Cachopo", "Carnes", "Ceviche", "Chuletón", "Cochinillo", "Cocido", "Cordero", "Couscous", "Croquetas", "De cuchara", "Fondue", "Hamburguesas", "Huevos Rotos", "Marisco", "Pad Thai", "Paella", "Pasta", "Pescaíto frito", "Pizza", "Poke", "Pulpo", "Ramen", "Risotto", "Setas", "Sushi", "Tapas", "Tartar", "Tortilla", "Wok"]
    };

    // Paso 3: Llamar a GPT-4o con contexto completo
    const systemPrompt = `Eres un experto asistente de búsqueda de restaurantes con acceso COMPLETO a la base de datos.

🎯 TU MISIÓN: Analizar la consulta del usuario y devolver los restaurantes más relevantes con explicación.

📊 CONTEXTO DISPONIBLE:
- Base de datos completa: ${businessesWithDistance.length} restaurantes activos
${userLocation ? `- Ubicación del usuario: Lat ${userLocation.lat}, Lng ${userLocation.lng}` : '- Sin ubicación del usuario'}
${userLocation ? '- Los restaurantes están ordenados por proximidad' : ''}

🔍 FILTROS DISPONIBLES:
- Tipos de cocina (cuisines): ${availableFilters.cuisines.join(', ')}
- Rangos de precio (prices): ${availableFilters.prices.join(', ')}
- Opciones dietéticas (diets): ${availableFilters.diets.join(', ')}
- Tipos de servicio (services): ${availableFilters.services.join(', ')}
- Especialidades (dishes): ${availableFilters.dishes.join(', ')}

🧠 ESTRATEGIA DE BÚSQUEDA:

1. **ANÁLISIS INTELIGENTE DE CONSULTA**:
   - Identifica tipo de cocina, ubicación, precio, ambiente, ocasión
   - Detecta restricciones dietéticas (vegano, sin gluten, etc.)
   - Reconoce especialidades de platos (sushi, pizza, paella, etc.)
   - Captura preferencias de servicio (menú del día, terraza, etc.)
   ${userLocation ? '- PRIORIZA restaurantes cercanos (usa campo distance)' : ''}

2. **SCORING MULTI-CRITERIO** (0-100 puntos):
   - Coincidencia con tipo de cocina: +30 puntos
   - Rating alto (>4.0): +25 puntos
   - Precio ajustado a solicitud: +15 puntos
   - Especialidad en plato solicitado: +20 puntos
   - Opciones dietéticas: +10 puntos
   ${userLocation ? '- Proximidad (<2km): +20 puntos, 2-5km: +10 puntos, >5km: -5 puntos' : ''}

3. **VALIDACIÓN CRÍTICA** ⚠️:
   - Si piden "barato" → SOLO € o €€
   - Si piden "lujo/caro" → SOLO €€€ o €€€€
   - Si piden "vegano" → DEBE tener "Vegano" en dietary_options
   - Si piden "sin gluten" → DEBE tener "Sin Gluten" en dietary_options
   - Si piden plato específico → DEBE estar en dishes o description
   - Si piden ubicación específica (Madrid, Barcelona, etc.) → SOLO restaurantes cuya address contenga esa ciudad/zona
   ${userLocation ? '- EXCLUYE restaurantes a más de 50km' : ''}

4. **RANKING FINAL**:
   - Top 10 restaurantes con puntuación más alta
   - ORDENAR: proximidad > score > rating

📋 FORMATO DE RESPUESTA JSON:

{
  "reasoning": "Explicación breve de tu estrategia de búsqueda (2-3 líneas)",
  "matches": [
    {
      "id": "uuid-del-restaurante",
      "name": "Nombre del restaurante",
      "score": 85,
      "reason": "Por qué este restaurante es relevante (1 línea)",
      "distance": "2.3 km"
    }
  ],
  "appliedFilters": {
    "location": "ubicación extraída o null",
    "cuisine": "tipo de cocina o null", 
    "keywords": "palabras clave relevantes",
    "priceRange": "rango de precio o null",
    "minRating": rating mínimo o null,
    "dietaryOptions": ["opciones dietéticas"],
    "serviceTypes": ["tipos de servicio"],
    "dishSpecialties": ["especialidades"]
  }
}

⚠️ VALIDACIONES CRÍTICAS:

1. **RESTRICCIONES TEMPORALES**:
   - Si piden "hoy", "esta noche", "ahora" → No puedes filtrar por horarios reales (no tenemos esa info)
   - Responde: "No puedo verificar disponibilidad en tiempo real, pero aquí están los mejores restaurantes..."

2. **RESTRICCIONES NEGATIVAS**:
   - Si dicen "NO quiero X" → EXCLUYE completamente restaurantes con X
   - Ejemplo: "sin carne" → EXCLUIR asadores, churrascas, chuletones

3. **AMBIGÜEDAD**:
   - Si la consulta es vaga ("restaurante bueno") → Prioriza por rating + proximidad
   - Si no hay matches perfectos → Relajar criterios pero EXPLICAR por qué

4. **LÍMITES**:
   - NUNCA devuelvas más de 10 restaurantes
   - NUNCA inventes información que no está en la BD
   - Si mencionan una ciudad/ubicación específica, SOLO devuelve restaurantes de esa ciudad
   ${userLocation ? '- NUNCA devuelvas restaurantes a más de 50km' : ''}

🚀 EJEMPLOS DE CONSULTAS:

Consulta: "sushi barato cerca de mí"
${userLocation ? '→ Buscar: cuisine=Japonés, price=€/€€, ordenar por distance' : '→ Buscar: cuisine=Japonés, price=€/€€'}

Consulta: "italiana romántica para aniversario"
→ Buscar: cuisine=Italiano, price=€€€/€€€€, keywords="romántico,terraza,ambiente"

Consulta: "vegano sin gluten con terraza"
→ Buscar: dietary_options=["Vegano","Sin Gluten"], services incluye terraza

Consulta: "restaurantes en Madrid"
→ Buscar: SOLO restaurantes cuya address contenga "Madrid"

Consulta: "japonés en Barcelona"
→ Buscar: cuisine=Japonés AND address contiene "Barcelona"

💡 RECUERDA:
- Sé ESTRICTO con las validaciones
- EXPLICA tu razonamiento
- PRIORIZA calidad sobre cantidad
${userLocation ? '- PRIORIZA proximidad cuando hay ubicación' : ''}
- NO inventes datos`;

    // Base de datos de restaurantes (SOLO PARA CONTEXTO - NO devolver completa)
    const restaurantDB = JSON.stringify(restaurantContext, null, 2);

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: `Base de datos de restaurantes disponibles:\n${restaurantDB}\n\nConsulta del usuario: "${query}"`
      }
    ];

    console.log('🤖 Llamando a OpenAI GPT-4o...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-2024-11-20',
        messages,
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error en OpenAI API:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('✅ Respuesta de OpenAI recibida');
    
    const result = JSON.parse(content);
    console.log('📊 Restaurantes encontrados:', result.matches?.length || 0);
    console.log('🔍 Razonamiento:', result.reasoning);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Error en búsqueda inteligente:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        matches: [],
        appliedFilters: {}
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
