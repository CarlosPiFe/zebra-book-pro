-- Drop and recreate the view with SECURITY INVOKER enabled
-- This ensures the view respects RLS policies of the querying user
DROP VIEW IF EXISTS public.booking_availability;

CREATE VIEW public.booking_availability
WITH (security_invoker=on)
AS
SELECT 
  id,
  business_id,
  booking_date,
  start_time,
  end_time,
  table_id,
  status,
  party_size,
  time_slot_id,
  created_at
FROM public.bookings
WHERE status NOT IN ('cancelled', 'completed');

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public.booking_availability TO anon, authenticated;