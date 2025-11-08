// Constantes compartidas para filtros de búsqueda
// Usadas en toda la aplicación para mantener consistencia

export const CUISINE_TYPES = [
  "Africano", "Alemán", "Americano", "Andaluz", "Árabe", "Argentino", "Arrocería", 
  "Asador", "Asiático", "Asturiano", "Belga", "Brasileño", "Canario", "Castellano", 
  "Catalán", "Chino", "Colombiano", "Coreano", "Crepería", "Cubano", "De Fusión", 
  "Del Norte", "Ecuatoriano", "Español", "Etíope", "Francés", "Gallego", "Griego", 
  "Indio", "Inglés", "Internacional", "Iraní", "Italiano", "Japonés", "Latino", 
  "Libanés", "Marisquería", "Marroquí", "Mediterráneo", "Mexicano", "Peruano", 
  "Portugués", "Ruso", "Suizo", "Tailandés", "Tradicional", "Turco", "Vasco", 
  "Vegetariano", "Venezolano", "Vietnamita"
];

export const SERVICE_TYPES = [
  "A la Carta", "Menú del Día", "Menú Degustación", "Buffet Libre", "Rodizio", 
  "Fast Food", "Fast Casual", "Gastrobar", "Asador", "Marisquería", "Freiduría", 
  "Bar de Tapas", "Coctelería", "Cervecería", "Vinoteca", "Pub", 
  "Cafetería", "Salón de Té", "Bar", "Brunch", "Churrería", "Chocolatería", 
  "Heladería", "Pastelería", "Crepería", 
  "Take Away", "Delivery", "Food Truck", "Catering"
];

export const DISH_SPECIALTIES = [
  "Aguacate", "Arepas", "Arroces", "Bacalao", "Burrito", "Cachopo", "Carnes", 
  "Ceviche", "Chuletón", "Cochinillo", "Cocido", "Cordero", "Couscous", "Croquetas", 
  "De cuchara", "Fondue", "Hamburguesas", "Huevos Rotos", "Marisco", "Pad Thai", 
  "Paella", "Pasta", "Pescaíto frito", "Pizza", "Poke", "Pulpo", "Ramen", 
  "Risotto", "Setas", "Sushi", "Tapas", "Tartar", "Tortilla", "Wok"
];

export const DIETARY_OPTIONS = [
  "Vegano", "Vegetariano", "Sin Gluten", "Halal", "Kosher"
];

export const PRICE_RANGES = ["€", "€€", "€€€", "€€€€"];

// Mapeo de rangos de precio a valores numéricos (punto medio de cada rango)
export const PRICE_RANGE_VALUES: Record<string, number> = {
  '€': 7.5,     // 0-15€ → 7.5€ medio
  '€€': 22.5,   // 15-30€ → 22.5€ medio
  '€€€': 45,    // 30-60€ → 45€ medio
  '€€€€': 105   // 60-150€ → 105€ medio
};

// Para management UI (incluye "Otro")
export const CUISINE_TYPES_WITH_OTHER = [...CUISINE_TYPES, "Otro"];
