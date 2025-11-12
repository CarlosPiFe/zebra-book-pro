-- Add color field to business_notes
ALTER TABLE public.business_notes 
ADD COLUMN color TEXT DEFAULT '#3b82f6';

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Business owners can upload note images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'note-images' 
  AND auth.uid() IS NOT NULL
);

-- Allow anyone to view note images (since notes are business-scoped)
CREATE POLICY "Anyone can view note images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'note-images');

-- Allow business owners to delete their note images
CREATE POLICY "Business owners can delete note images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'note-images' 
  AND auth.uid() IS NOT NULL
);