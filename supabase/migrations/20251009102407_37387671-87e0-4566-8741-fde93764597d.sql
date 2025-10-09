-- Create a policy to allow anyone to view active businesses
CREATE POLICY "Anyone can view active businesses"
ON public.businesses
FOR SELECT
USING (is_active = true);