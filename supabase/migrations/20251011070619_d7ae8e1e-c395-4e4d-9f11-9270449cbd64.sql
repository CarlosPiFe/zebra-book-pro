-- Update the bookings status check constraint to include all valid states
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status = ANY (ARRAY['reserved'::text, 'pending'::text, 'occupied'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text]));