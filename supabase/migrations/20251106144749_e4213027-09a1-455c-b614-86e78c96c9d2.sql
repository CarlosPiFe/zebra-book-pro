-- Create storage bucket for payroll documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payroll-documents',
  'payroll-documents',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create RLS policies for payroll documents
CREATE POLICY "Business owners can upload payroll documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payroll-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT b.id::text
    FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can view their payroll documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payroll-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT b.id::text
    FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their payroll documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payroll-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT b.id::text
    FROM businesses b
    WHERE b.owner_id = auth.uid()
  )
);

-- Add document_url column to payroll_records if not exists (already exists based on schema)
-- This column will store the storage path to the uploaded document