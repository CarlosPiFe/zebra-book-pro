-- Add table_id to bookings to link reservations with specific tables
ALTER TABLE public.bookings ADD COLUMN table_id uuid REFERENCES public.tables(id) ON DELETE CASCADE;

-- Add manual booking fields for client information (when not linked to a user)
ALTER TABLE public.bookings ADD COLUMN client_name text;
ALTER TABLE public.bookings ADD COLUMN client_phone text;
ALTER TABLE public.bookings ADD COLUMN client_email text;

-- Make client_id nullable to allow manual bookings without user accounts
ALTER TABLE public.bookings ALTER COLUMN client_id DROP NOT NULL;

-- Update status field to use specific values
-- Status can be: 'reserved' (reservada), 'occupied' (comiendo), 'completed' (completada), 'cancelled' (cancelada)
ALTER TABLE public.bookings ALTER COLUMN status SET DEFAULT 'reserved';

-- Add check constraint to ensure either client_id or client_name is provided
ALTER TABLE public.bookings ADD CONSTRAINT bookings_client_check 
  CHECK (client_id IS NOT NULL OR client_name IS NOT NULL);

-- Update RLS policy to allow business owners to manage all bookings for their tables
DROP POLICY IF EXISTS "Business owners can view bookings for their businesses" ON public.bookings;
DROP POLICY IF EXISTS "Business owners can update bookings for their businesses" ON public.bookings;

CREATE POLICY "Business owners can view bookings for their tables"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = bookings.table_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can insert bookings for their tables"
ON public.bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = bookings.table_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update bookings for their tables"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = bookings.table_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete bookings for their tables"
ON public.bookings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = bookings.table_id
    AND businesses.owner_id = auth.uid()
  )
);