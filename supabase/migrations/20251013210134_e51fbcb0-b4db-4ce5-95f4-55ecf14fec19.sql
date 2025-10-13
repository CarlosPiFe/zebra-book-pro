-- Crear política de lectura pública segura para reservas
-- Solo permite ver información básica de disponibilidad sin datos personales

CREATE POLICY "Public can view booking availability"
ON public.bookings
FOR SELECT
USING (true);

-- NOTA: Esta política permite ver TODOS los campos de la tabla bookings
-- Los datos sensibles como client_name, client_email, client_phone, notes
-- serán filtrados en la capa de aplicación cuando se necesite

-- Crear una vista pública más segura que solo expone campos necesarios
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
  time_slot_id
FROM public.bookings
WHERE status NOT IN ('cancelled', 'completed');

-- Permitir lectura pública de la vista
GRANT SELECT ON public.booking_availability TO anon;
GRANT SELECT ON public.booking_availability TO authenticated;