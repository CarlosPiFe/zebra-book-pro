-- Drop the restrictive policy that requires a table_id
DROP POLICY IF EXISTS "Business owners can insert bookings for their tables" ON public.bookings;

-- Create a new policy that allows business owners to insert bookings for their businesses
-- This works for both hospitality businesses (with tables) and non-hospitality businesses (without tables)
CREATE POLICY "Business owners can insert bookings for their businesses"
ON public.bookings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM businesses
    WHERE businesses.id = bookings.business_id
    AND businesses.owner_id = auth.uid()
  )
);