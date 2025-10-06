-- Add business_phone column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN business_phone text;