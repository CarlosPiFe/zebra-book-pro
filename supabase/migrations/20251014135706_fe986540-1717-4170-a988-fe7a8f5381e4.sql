-- Añadir columna para el modo de reserva en la tabla businesses
ALTER TABLE public.businesses
ADD COLUMN booking_mode text NOT NULL DEFAULT 'automatic'
CHECK (booking_mode IN ('automatic', 'manual'));

COMMENT ON COLUMN public.businesses.booking_mode IS 'Modo de reserva: automatic (confirmación inmediata) o manual (requiere aprobación del negocio)';

-- Actualizar el estado de las reservas para soportar "pending_confirmation"
-- El campo status ya existe, solo aseguramos que acepta este nuevo valor
COMMENT ON COLUMN public.bookings.status IS 'Estado de la reserva: reserved, confirmed, cancelled, completed, no_show, pending_confirmation';