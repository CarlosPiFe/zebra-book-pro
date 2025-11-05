-- Crear políticas RLS para el bucket business-images
-- Permitir a usuarios autenticados subir fotos de sus negocios
CREATE POLICY "Users can upload business photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-images' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Permitir a usuarios autenticados actualizar fotos de sus negocios
CREATE POLICY "Users can update their business photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Permitir a usuarios autenticados eliminar fotos de sus negocios
CREATE POLICY "Users can delete their business photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-images'
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

-- Permitir a todos ver las fotos (bucket público)
CREATE POLICY "Public access to business photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-images');