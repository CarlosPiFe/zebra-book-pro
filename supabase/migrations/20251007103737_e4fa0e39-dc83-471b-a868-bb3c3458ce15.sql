-- Drop the restrictive policy that requires table_id
DROP POLICY IF EXISTS "Business owners can view bookings for their tables" ON public.bookings;

-- Create a more comprehensive policy that allows business owners to view all bookings for their business
CREATE POLICY "Business owners can view all their business bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.id = bookings.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Update the update policy to also work without table_id
DROP POLICY IF EXISTS "Business owners can update bookings for their tables" ON public.bookings;

CREATE POLICY "Business owners can update their business bookings"
ON public.bookings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.id = bookings.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Update the delete policy to also work without table_id
DROP POLICY IF EXISTS "Business owners can delete bookings for their tables" ON public.bookings;

CREATE POLICY "Business owners can delete their business bookings"
ON public.bookings
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE businesses.id = bookings.business_id
    AND businesses.owner_id = auth.uid()
  )
);