-- Crear tabla de franjas horarias con IDs fijos
CREATE TABLE IF NOT EXISTS public.time_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_time time without time zone NOT NULL,
  slot_order integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(slot_time)
);

-- Habilitar RLS
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan ver las franjas horarias
CREATE POLICY "Anyone can view time slots"
ON public.time_slots
FOR SELECT
USING (true);

-- Política para que los dueños de negocios puedan gestionar franjas horarias
CREATE POLICY "Business owners can manage time slots"
ON public.time_slots
FOR ALL
USING (true);

-- Insertar franjas horarias estándar (cada hora de 00:00 a 23:00)
INSERT INTO public.time_slots (slot_time, slot_order)
SELECT 
  (hour || ':00:00')::time,
  hour
FROM generate_series(0, 23) AS hour
ON CONFLICT (slot_time) DO NOTHING;

-- Añadir columna time_slot_id a bookings (nullable inicialmente para migración)
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS time_slot_id uuid REFERENCES public.time_slots(id);

-- Migrar datos existentes: asignar time_slot_id basado en start_time
UPDATE public.bookings
SET time_slot_id = (
  SELECT id 
  FROM public.time_slots 
  WHERE slot_time = date_trunc('hour', start_time::time)::time
  LIMIT 1
)
WHERE time_slot_id IS NULL;

-- Hacer time_slot_id obligatorio después de la migración
ALTER TABLE public.bookings 
ALTER COLUMN time_slot_id SET NOT NULL;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot ON public.bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_slot ON public.bookings(booking_date, time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_table_date ON public.bookings(table_id, booking_date);