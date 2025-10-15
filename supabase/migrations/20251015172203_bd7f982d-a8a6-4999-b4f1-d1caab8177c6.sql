-- Add 'pending_confirmation' to bookings status check constraint
-- Including all existing status values found in the database
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN (
  'pending', 
  'reserved', 
  'confirmed', 
  'cancelled', 
  'completed', 
  'no_show', 
  'occupied',
  'pending_confirmation', 
  'in_progress', 
  'delayed'
));