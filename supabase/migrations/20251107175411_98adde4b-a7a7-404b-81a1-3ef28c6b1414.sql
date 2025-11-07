-- Añadir columnas para opciones dietéticas, servicios y especialidades
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS dietary_options text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS service_types text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS dish_specialties text[] DEFAULT '{}';

-- Añadir índices para mejorar el rendimiento de búsquedas
CREATE INDEX IF NOT EXISTS idx_businesses_dietary_options ON public.businesses USING GIN(dietary_options);
CREATE INDEX IF NOT EXISTS idx_businesses_service_types ON public.businesses USING GIN(service_types);
CREATE INDEX IF NOT EXISTS idx_businesses_dish_specialties ON public.businesses USING GIN(dish_specialties);
CREATE INDEX IF NOT EXISTS idx_businesses_cuisine_type ON public.businesses(cuisine_type);

-- Comentarios para documentar las columnas
COMMENT ON COLUMN public.businesses.dietary_options IS 'Array de opciones dietéticas: Vegano, Vegetariano, Sin Gluten, Halal, Kosher';
COMMENT ON COLUMN public.businesses.service_types IS 'Array de tipos de servicio: A la Carta, Menú del Día, Buffet Libre, Take Away, etc.';
COMMENT ON COLUMN public.businesses.dish_specialties IS 'Array de especialidades: Sushi, Pizza, Pasta, Paella, Hamburguesas, etc.';