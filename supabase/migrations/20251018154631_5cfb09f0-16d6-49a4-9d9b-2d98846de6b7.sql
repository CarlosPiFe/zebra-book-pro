-- Add room_id to tables
ALTER TABLE public.tables 
ADD COLUMN room_id uuid REFERENCES public.business_rooms(id) ON DELETE SET NULL;

-- Add room_id to bookings
ALTER TABLE public.bookings 
ADD COLUMN room_id uuid REFERENCES public.business_rooms(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX idx_tables_room_id ON public.tables(room_id);
CREATE INDEX idx_bookings_room_id ON public.bookings(room_id);