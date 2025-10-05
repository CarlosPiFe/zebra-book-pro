-- Create storage bucket for business images
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-images', 'business-images', true);

-- Create storage policies for business images
CREATE POLICY "Anyone can view business images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-images');

CREATE POLICY "Business owners can upload their business images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business owners can update their business images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'business-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business owners can delete their business images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'business-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);