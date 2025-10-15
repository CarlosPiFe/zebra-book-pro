-- Add booking_mode column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS booking_mode text NOT NULL DEFAULT 'automatic' 
CHECK (booking_mode IN ('automatic', 'manual'));

COMMENT ON COLUMN public.businesses.booking_mode IS 'Tipo de confirmación de reservas: automatic (confirmación automática) o manual (requiere aprobación)';