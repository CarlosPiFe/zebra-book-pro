-- First, update existing NULL values with defaults
UPDATE public.bookings 
SET client_name = 'Cliente Sin Nombre' 
WHERE client_name IS NULL;

UPDATE public.bookings 
SET client_phone = 'Sin Teléfono' 
WHERE client_phone IS NULL;

UPDATE public.bookings 
SET party_size = 2 
WHERE party_size IS NULL;

-- Now make fields NOT NULL with proper defaults
ALTER TABLE public.bookings 
  ALTER COLUMN client_name SET NOT NULL,
  ALTER COLUMN client_name SET DEFAULT 'Cliente';

ALTER TABLE public.bookings 
  ALTER COLUMN client_phone SET NOT NULL,
  ALTER COLUMN client_phone SET DEFAULT '';

ALTER TABLE public.bookings 
  ALTER COLUMN party_size SET NOT NULL,
  ALTER COLUMN party_size SET DEFAULT 2;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_business_date 
  ON public.bookings(business_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_status 
  ON public.bookings(status);

-- Add check constraint for valid party size
ALTER TABLE public.bookings 
  ADD CONSTRAINT check_party_size_positive 
  CHECK (party_size > 0 AND party_size <= 50);