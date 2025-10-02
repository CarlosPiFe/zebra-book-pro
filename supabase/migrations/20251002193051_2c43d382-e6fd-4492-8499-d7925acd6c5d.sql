-- Add party_size column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS party_size INTEGER;

-- Drop the old status check constraint if it exists
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the correct status check constraint
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status IN ('reserved', 'occupied', 'completed', 'cancelled'));