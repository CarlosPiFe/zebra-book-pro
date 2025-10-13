-- Create secure view for public booking availability
-- Only exposes non-sensitive fields, excludes personal information
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
  time_slot_id,
  created_at
FROM public.bookings
WHERE status NOT IN ('cancelled', 'completed');

-- Grant access to anonymous and authenticated users
GRANT SELECT ON public.booking_availability TO anon, authenticated;