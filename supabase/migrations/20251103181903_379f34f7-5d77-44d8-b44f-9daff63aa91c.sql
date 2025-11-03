-- Step 1: Drop existing constraint
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Step 2: Update existing data to new status values
UPDATE public.bookings 
SET status = 'in_progress' 
WHERE status = 'occupied';

UPDATE public.bookings 
SET status = 'pending_client_confirmation' 
WHERE status IN ('pending', 'pending_confirmation');

-- Step 3: Add new constraint with updated status values
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending_client_confirmation', 'pending_business_confirmation', 'confirmed', 'rejected', 'completed', 'cancelled', 'no_show', 'in_progress', 'delayed'));

-- Step 4: Add confirmation_mode to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS confirmation_mode TEXT NOT NULL DEFAULT 'automatic' 
CHECK (confirmation_mode IN ('automatic', 'manual'));

-- Step 5: Add confirmation tokens for email links
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS client_confirmation_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS business_confirmation_token TEXT UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex');

-- Step 6: Add rejection reason
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 7: Create indexes for faster token lookups
CREATE INDEX IF NOT EXISTS idx_bookings_client_confirmation_token ON public.bookings(client_confirmation_token);
CREATE INDEX IF NOT EXISTS idx_bookings_business_confirmation_token ON public.bookings(business_confirmation_token);