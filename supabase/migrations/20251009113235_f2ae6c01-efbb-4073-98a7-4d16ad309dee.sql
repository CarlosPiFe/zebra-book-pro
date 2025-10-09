-- Allow public bookings (without authentication)
-- This policy allows anyone to create a booking when client_id is NULL
CREATE POLICY "Allow public bookings without authentication"
ON public.bookings
FOR INSERT
WITH CHECK (client_id IS NULL);