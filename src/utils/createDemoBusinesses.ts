import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";

interface DemoBusinessData {
  name: string;
  cuisine_type: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  imageNumber: number;
}

const demoBusinesses: DemoBusinessData[] = [
  {
    name: "Dragon Kan",
    cuisine_type: "China",
    description: "Auténtica cocina china con recetas tradicionales de diferentes regiones de China. Especialidades en dim sum y pato laqueado.",
    address: "Calle del Dragón 15, Madrid",
    phone: "+34 912 345 001",
    email: "info@dragonkan.com",
    imageNumber: 1
  },
  {
    name: "La Bella Toscana",
    cuisine_type: "Italiana",
    description: "Restaurante italiano familiar con pastas frescas hechas a mano y pizzas al horno de leña. Ambiente acogedor y romántico.",
    address: "Plaza Mayor 8, Barcelona",
    phone: "+34 933 456 002",
    email: "hola@bellatoscana.es",
    imageNumber: 2
  },
  {
    name: "Sakura Sushi Bar",
    cuisine_type: "Japonesa",
    description: "Sushi bar contemporáneo con ingredientes premium y chefs japoneses. Experiencia omakase disponible.",
    address: "Avenida del Sol 42, Valencia",
    phone: "+34 963 567 003",
    email: "reservas@sakurasushi.es",
    imageNumber: 3
  },
  {
    name: "El Asador Vasco",
    cuisine_type: "Vasca",
    description: "Cocina vasca tradicional con los mejores productos del Cantábrico. Especialidad en txuleta y pescados a la parrilla.",
    address: "Calle Bilbao 23, San Sebastián",
    phone: "+34 943 678 004",
    email: "contacto@asadorvasco.com",
    imageNumber: 4
  },
  {
    name: "Curry Palace",
    cuisine_type: "India",
    description: "Restaurante hindú con auténticos sabores de la India. Gran variedad de currys, tandoori y panes naan recién horneados.",
    address: "Calle Bombay 7, Madrid",
    phone: "+34 915 789 005",
    email: "info@currypalace.es",
    imageNumber: 5
  },
  {
    name: "Le Petit Bistro",
    cuisine_type: "Francesa",
    description: "Bistró francés elegante con platos clásicos parisinos. Selección de vinos franceses y postres artesanales.",
    address: "Paseo de Gracia 56, Barcelona",
    phone: "+34 934 890 006",
    email: "reservations@petitbistro.cat",
    imageNumber: 6
  },
  {
    name: "Tacos & Tequila",
    cuisine_type: "Mexicana",
    description: "Cocina mexicana auténtica con tacos, burritos y más de 50 tipos de tequila. Ambiente festivo y colorido.",
    address: "Calle México 31, Sevilla",
    phone: "+34 954 901 007",
    email: "hola@tacosytequila.es",
    imageNumber: 7
  },
  {
    name: "Marisquería O Grove",
    cuisine_type: "Gallega",
    description: "Especialistas en mariscos y pescados frescos de las rías gallegas. Pulpo a la gallega y percebes de primera calidad.",
    address: "Puerto Marítimo 12, A Coruña",
    phone: "+34 981 012 008",
    email: "info@marisqueriaogrove.gal",
    imageNumber: 8
  },
  {
    name: "Bangkok Street Food",
    cuisine_type: "Tailandesa",
    description: "Auténtica comida callejera tailandesa. Pad Thai, curries aromáticos y platos picantes llenos de sabor.",
    address: "Calle Asia 19, Valencia",
    phone: "+34 962 123 009",
    email: "pedidos@bangkokstreet.es",
    imageNumber: 9
  },
  {
    name: "Taberna Andaluza",
    cuisine_type: "Andaluza",
    description: "Tapas y raciones andaluzas tradicionales. Jamón ibérico, salmorejo y pescaíto frito. Ambiente flamenco.",
    address: "Plaza Andalucía 4, Granada",
    phone: "+34 958 234 010",
    email: "reservas@tabernaandaluza.com",
    imageNumber: 10
  },
  {
    name: "Seoul BBQ House",
    cuisine_type: "Coreana",
    description: "Barbacoa coreana al estilo tradicional. Cocina tu propia carne en la mesa. Kimchi casero y banchan incluidos.",
    address: "Calle Corea 28, Madrid",
    phone: "+34 911 345 011",
    email: "info@seoulbbq.es",
    imageNumber: 11
  },
  {
    name: "Trattoria Da Marco",
    cuisine_type: "Italiana",
    description: "Trattoria italiana íntima con recetas de la nonna. Risottos cremosos y ossobuco milanés. Vinos italianos seleccionados.",
    address: "Calle Venecia 9, Barcelona",
    phone: "+34 932 456 012",
    email: "marco@trattoriadamarco.cat",
    imageNumber: 12
  },
  {
    name: "Aloha Poke Bowl",
    cuisine_type: "Hawaiana",
    description: "Poke bowls frescos y saludables al estilo hawaiano. Pescado crudo de calidad sashimi con ingredientes tropicales.",
    address: "Paseo Marítimo 67, Málaga",
    phone: "+34 952 567 013",
    email: "aloha@pokebowl.es",
    imageNumber: 13
  },
  {
    name: "Casa Gallega",
    cuisine_type: "Gallega",
    description: "Cocina gallega casera y contundente. Caldo gallego, lacón con grelos y empanada artesanal. Vinos de Rías Baixas.",
    address: "Rúa Santiago 34, Santiago de Compostela",
    phone: "+34 981 678 014",
    email: "reservas@casagallega.gal",
    imageNumber: 14
  },
  {
    name: "Beirut Express",
    cuisine_type: "Libanesa",
    description: "Comida libanesa rápida y deliciosa. Shawarmas, falafel, hummus y baklava casero. Opciones vegetarianas abundantes.",
    address: "Calle Líbano 45, Madrid",
    phone: "+34 914 789 015",
    email: "pedidos@beirutexpress.es",
    imageNumber: 15
  },
  {
    name: "El Rincón Argentino",
    cuisine_type: "Argentina",
    description: "Parrilla argentina con las mejores carnes. Bife de chorizo, entraña y chimichurri casero. Vinos malbec premium.",
    address: "Avenida Buenos Aires 88, Valencia",
    phone: "+34 963 890 016",
    email: "info@rinconargentino.es",
    imageNumber: 16
  },
  {
    name: "Pho Vietnam",
    cuisine_type: "Vietnamita",
    description: "Sopas pho tradicionales y banh mi frescos. Rollitos de primavera y café vietnamita con hielo. Auténtico sabor de Hanói.",
    address: "Calle Vietnam 52, Barcelona",
    phone: "+34 935 901 017",
    email: "hola@phovietnam.cat",
    imageNumber: 17
  },
  {
    name: "Burger & Beer Station",
    cuisine_type: "Americana",
    description: "Hamburguesas gourmet con carne 100% angus. Patatas crujientes y más de 20 cervezas artesanales. Ambiente casual americano.",
    address: "Plaza Estados Unidos 3, Madrid",
    phone: "+34 917 012 018",
    email: "info@burgerbeerstation.com",
    imageNumber: 18
  },
  {
    name: "Tapeo Moderno",
    cuisine_type: "Española Fusión",
    description: "Tapas españolas con un toque moderno y creativo. Cocina de autor con productos de temporada. Carta de vinos exclusiva.",
    address: "Calle Innovación 21, Bilbao",
    phone: "+34 944 123 019",
    email: "reservas@tapeomoderno.es",
    imageNumber: 19
  },
  {
    name: "Ramen Ya",
    cuisine_type: "Japonesa",
    description: "Ramen auténtico japonés con caldos cocinados durante 12 horas. Gyozas caseros y yakitori. Pequeño pero acogedor.",
    address: "Calle Tokio 16, Madrid",
    phone: "+34 918 234 020",
    email: "info@ramenya.es",
    imageNumber: 20
  }
];

export async function createDemoBusinesses() {
  try {
    console.log("Iniciando creación de negocios demo...");

    // Primero, necesitamos obtener el user_id del usuario actual o crear uno de prueba
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("No hay usuario autenticado para crear los negocios demo");
    }

    const results = [];

    for (const business of demoBusinesses) {
      try {
        // Cargar la imagen desde public
        const imageResponse = await fetch(`/demo-restaurants/restaurant-${business.imageNumber}.jpg`);
        const imageBlob = await imageResponse.blob();
        const imageFile = new File([imageBlob], `restaurant-${business.imageNumber}.jpg`, { type: 'image/jpeg' });

        console.log(`Comprimiendo imagen ${business.imageNumber}...`);
        // Comprimir la imagen
        const compressedFile = await compressImage(imageFile, 250);

        console.log(`Subiendo imagen ${business.imageNumber} a Supabase...`);
        // Subir la imagen comprimida a Supabase Storage
        const fileName = `demo-${business.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('business-images')
          .upload(fileName, compressedFile);

        if (uploadError) throw uploadError;

        // Obtener la URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('business-images')
          .getPublicUrl(fileName);

        console.log(`Creando negocio: ${business.name}...`);
        // Crear el negocio en la base de datos
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .insert({
            owner_id: user.id,
            name: business.name,
            cuisine_type: business.cuisine_type,
            description: business.description,
            address: business.address,
            phone: business.phone,
            email: business.email,
            image_url: publicUrl,
            is_active: true
          })
          .select()
          .single();

        if (businessError) throw businessError;

        results.push({
          success: true,
          business: business.name,
          data: businessData
        });

        console.log(`✅ ${business.name} creado exitosamente`);
      } catch (error) {
        console.error(`❌ Error creando ${business.name}:`, error);
        results.push({
          success: false,
          business: business.name,
          error: error
        });
      }
    }

    return {
      success: true,
      results,
      total: demoBusinesses.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  } catch (error) {
    console.error("Error general creando negocios demo:", error);
    throw error;
  }
}
