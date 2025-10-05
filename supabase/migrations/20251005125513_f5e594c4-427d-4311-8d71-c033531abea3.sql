-- Add booking slot duration to businesses table
ALTER TABLE public.businesses 
ADD COLUMN booking_slot_duration_minutes integer NOT NULL DEFAULT 60;

-- Add comment
COMMENT ON COLUMN public.businesses.booking_slot_duration_minutes IS 'Default duration in minutes for booking time slots';