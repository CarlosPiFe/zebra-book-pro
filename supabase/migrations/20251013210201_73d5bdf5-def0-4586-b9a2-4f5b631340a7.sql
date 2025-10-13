-- Crear una vista pública más segura que solo expone campos necesarios para disponibilidad
-- Esta vista NO incluye datos personales sensibles
CREATE OR REPLACE VIEW public.booking_availability AS
SELECT 
  id,
  business_id,
  booking_date,
  start_time,
  end_time,
  table_id,
  status,
  party_size,
  time_slot_id,
  created_at
FROM public.bookings
WHERE status NOT IN ('cancelled', 'completed');

-- Habilitar RLS en la vista
ALTER VIEW public.booking_availability SET (security_invoker = true);

-- Permitir lectura pública de la vista
GRANT SELECT ON public.booking_availability TO anon;
GRANT SELECT ON public.booking_availability TO authenticated;