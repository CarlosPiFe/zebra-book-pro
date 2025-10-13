-- Eliminar la vista anterior que causó el error de seguridad
DROP VIEW IF EXISTS public.booking_availability;

-- Recrear la vista SIN security definer (más segura)
CREATE VIEW public.booking_availability 
WITH (security_invoker = true) AS
SELECT 
  id,
  business_id,
  booking_date,
  start_time,
  end_time,
  table_id,
  status,
  party_size,
  time_slot_id
FROM public.bookings
WHERE status NOT IN ('cancelled', 'completed');

-- Dar permisos de lectura
GRANT SELECT ON public.booking_availability TO anon;
GRANT SELECT ON public.booking_availability TO authenticated;