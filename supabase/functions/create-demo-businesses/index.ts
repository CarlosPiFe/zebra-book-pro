import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DemoBusinessData {
  name: string;
  cuisine_type: string;
  description: string;
  address: string;
  phone: string;
}

const demoBusinesses: DemoBusinessData[] = [
  {
    name: "Dragon Kan",
    cuisine_type: "China",
    description: "Auténtica cocina china con recetas tradicionales de diferentes regiones de China. Especialidades en dim sum y pato laqueado.",
    address: "Calle del Dragón 15, Madrid",
    phone: "+34 912 345 001"
  },
  {
    name: "La Bella Toscana",
    cuisine_type: "Italiana",
    description: "Restaurante italiano familiar con pastas frescas hechas a mano y pizzas al horno de leña. Ambiente acogedor y romántico.",
    address: "Plaza Mayor 8, Barcelona",
    phone: "+34 933 456 002"
  },
  {
    name: "Sakura Sushi Bar",
    cuisine_type: "Japonesa",
    description: "Sushi bar contemporáneo con ingredientes premium y chefs japoneses. Experiencia omakase disponible.",
    address: "Avenida del Sol 42, Valencia",
    phone: "+34 963 567 003"
  },
  {
    name: "El Asador Vasco",
    cuisine_type: "Vasca",
    description: "Cocina vasca tradicional con los mejores productos del Cantábrico. Especialidad en txuleta y pescados a la parrilla.",
    address: "Calle Bilbao 23, San Sebastián",
    phone: "+34 943 678 004"
  },
  {
    name: "Curry Palace",
    cuisine_type: "India",
    description: "Restaurante hindú con auténticos sabores de la India. Gran variedad de currys, tandoori y panes naan recién horneados.",
    address: "Calle Bombay 7, Madrid",
    phone: "+34 915 789 005"
  },
  {
    name: "Le Petit Bistro",
    cuisine_type: "Francesa",
    description: "Bistró francés elegante con platos clásicos parisinos. Selección de vinos franceses y postres artesanales.",
    address: "Paseo de Gracia 56, Barcelona",
    phone: "+34 934 890 006"
  },
  {
    name: "Tacos & Tequila",
    cuisine_type: "Mexicana",
    description: "Cocina mexicana auténtica con tacos, burritos y más de 50 tipos de tequila. Ambiente festivo y colorido.",
    address: "Calle México 31, Sevilla",
    phone: "+34 954 901 007"
  },
  {
    name: "Marisquería O Grove",
    cuisine_type: "Gallega",
    description: "Especialistas en mariscos y pescados frescos de las rías gallegas. Pulpo a la gallega y percebes de primera calidad.",
    address: "Puerto Marítimo 12, A Coruña",
    phone: "+34 981 012 008"
  },
  {
    name: "Bangkok Street Food",
    cuisine_type: "Tailandesa",
    description: "Auténtica comida callejera tailandesa. Pad Thai, curries aromáticos y platos picantes llenos de sabor.",
    address: "Calle Asia 19, Valencia",
    phone: "+34 962 123 009"
  },
  {
    name: "Taberna Andaluza",
    cuisine_type: "Andaluza",
    description: "Tapas y raciones andaluzas tradicionales. Jamón ibérico, salmorejo y pescaíto frito. Ambiente flamenco.",
    address: "Plaza Andalucía 4, Granada",
    phone: "+34 958 234 010"
  },
  {
    name: "Seoul BBQ House",
    cuisine_type: "Coreana",
    description: "Barbacoa coreana al estilo tradicional. Cocina tu propia carne en la mesa. Kimchi casero y banchan incluidos.",
    address: "Calle Corea 28, Madrid",
    phone: "+34 911 345 011"
  },
  {
    name: "Trattoria Da Marco",
    cuisine_type: "Italiana",
    description: "Trattoria italiana íntima con recetas de la nonna. Risottos cremosos y ossobuco milanés. Vinos italianos seleccionados.",
    address: "Calle Venecia 9, Barcelona",
    phone: "+34 932 456 012"
  },
  {
    name: "Aloha Poke Bowl",
    cuisine_type: "Hawaiana",
    description: "Poke bowls frescos y saludables al estilo hawaiano. Pescado crudo de calidad sashimi con ingredientes tropicales.",
    address: "Paseo Marítimo 67, Málaga",
    phone: "+34 952 567 013"
  },
  {
    name: "Casa Gallega",
    cuisine_type: "Gallega",
    description: "Cocina gallega casera y contundente. Caldo gallego, lacón con grelos y empanada artesanal. Vinos de Rías Baixas.",
    address: "Rúa Santiago 34, Santiago de Compostela",
    phone: "+34 981 678 014"
  },
  {
    name: "Beirut Express",
    cuisine_type: "Libanesa",
    description: "Comida libanesa rápida y deliciosa. Shawarmas, falafel, hummus y baklava casero. Opciones vegetarianas abundantes.",
    address: "Calle Líbano 45, Madrid",
    phone: "+34 914 789 015"
  },
  {
    name: "El Rincón Argentino",
    cuisine_type: "Argentina",
    description: "Parrilla argentina con las mejores carnes. Bife de chorizo, entraña y chimichurri casero. Vinos malbec premium.",
    address: "Avenida Buenos Aires 88, Valencia",
    phone: "+34 963 890 016"
  },
  {
    name: "Pho Vietnam",
    cuisine_type: "Vietnamita",
    description: "Sopas pho tradicionales y banh mi frescos. Rollitos de primavera y café vietnamita con hielo. Auténtico sabor de Hanói.",
    address: "Calle Vietnam 52, Barcelona",
    phone: "+34 935 901 017"
  },
  {
    name: "Burger & Beer Station",
    cuisine_type: "Americana",
    description: "Hamburguesas gourmet con carne 100% angus. Patatas crujientes y más de 20 cervezas artesanales. Ambiente casual americano.",
    address: "Plaza Estados Unidos 3, Madrid",
    phone: "+34 917 012 018"
  },
  {
    name: "Tapeo Moderno",
    cuisine_type: "Española Fusión",
    description: "Tapas españolas con un toque moderno y creativo. Cocina de autor con productos de temporada. Carta de vinos exclusiva.",
    address: "Calle Innovación 21, Bilbao",
    phone: "+34 944 123 019"
  },
  {
    name: "Ramen Ya",
    cuisine_type: "Japonesa",
    description: "Ramen auténtico japonés con caldos cocinados durante 12 horas. Gyozas caseros y yakitori. Pequeño pero acogedor.",
    address: "Calle Tokio 16, Madrid",
    phone: "+34 918 234 020"
  }
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results = []
    const password = 'holahola'

    console.log('Starting to create demo businesses...')

    for (const business of demoBusinesses) {
      try {
        // Use business name as email
        const email = business.name

        console.log(`Creating user for: ${email}`)

        // Create user with service role
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: business.name
          }
        })

        if (authError) {
          console.error(`Auth error for ${email}:`, authError)
          results.push({
            success: false,
            business: business.name,
            error: authError.message
          })
          continue
        }

        console.log(`User created successfully for: ${email}`)

        // Create the business
        const { data: businessData, error: businessError } = await supabaseAdmin
          .from('businesses')
          .insert({
            owner_id: authData.user.id,
            name: business.name,
            cuisine_type: business.cuisine_type,
            description: business.description,
            address: business.address,
            phone: business.phone,
            email: email,
            is_active: true
          })
          .select()
          .single()

        if (businessError) {
          console.error(`Business error for ${business.name}:`, businessError)
          results.push({
            success: false,
            business: business.name,
            error: businessError.message
          })
          continue
        }

        console.log(`Business created successfully: ${business.name}`)

        results.push({
          success: true,
          business: business.name,
          email: email,
          userId: authData.user.id,
          businessId: businessData.id
        })

      } catch (error: any) {
        console.error(`Error with ${business.name}:`, error)
        results.push({
          success: false,
          business: business.name,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`Completed: ${successful} successful, ${failed} failed`)

    return new Response(
      JSON.stringify({
        success: true,
        total: demoBusinesses.length,
        successful,
        failed,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('General error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
