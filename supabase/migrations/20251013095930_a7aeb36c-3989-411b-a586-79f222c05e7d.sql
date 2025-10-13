-- Añadir columna para mensaje adicional de reservas
ALTER TABLE public.businesses 
ADD COLUMN booking_additional_message TEXT;