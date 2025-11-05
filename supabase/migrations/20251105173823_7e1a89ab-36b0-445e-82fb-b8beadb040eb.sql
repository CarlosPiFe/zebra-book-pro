-- Eliminar restricciones del campo category y renombrarlo a cuisine_type
-- Hacer cuisine_type nullable y eliminable

-- Primero, añadir la nueva columna cuisine_type
ALTER TABLE public.businesses
ADD COLUMN cuisine_type TEXT;

-- Copiar los datos de category a cuisine_type (solo para los que sean 'restaurante')
UPDATE public.businesses
SET cuisine_type = NULL
WHERE category IN ('restaurante', 'bar', 'cafetería', 'peluquería');

-- Ahora eliminar la columna category
ALTER TABLE public.businesses
DROP COLUMN category;

-- Añadir índice para mejorar búsquedas por tipo de cocina
CREATE INDEX idx_businesses_cuisine_type ON public.businesses(cuisine_type) WHERE cuisine_type IS NOT NULL;