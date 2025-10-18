-- Allow anyone to view active business rooms (needed for public booking)
CREATE POLICY "Anyone can view active rooms"
ON public.business_rooms
FOR SELECT
USING (is_active = true);