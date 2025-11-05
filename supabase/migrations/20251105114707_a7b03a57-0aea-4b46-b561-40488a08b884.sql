-- Función para actualizar automáticamente la imagen principal del negocio
CREATE OR REPLACE FUNCTION public.sync_business_main_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_first_photo_url TEXT;
BEGIN
  -- Obtener el business_id del registro afectado
  v_business_id := COALESCE(NEW.business_id, OLD.business_id);
  
  -- Obtener la primera foto ordenada por display_order
  SELECT photo_url INTO v_first_photo_url
  FROM public.business_photos
  WHERE business_id = v_business_id
  ORDER BY display_order ASC
  LIMIT 1;
  
  -- Actualizar la imagen principal del negocio
  UPDATE public.businesses
  SET image_url = v_first_photo_url
  WHERE id = v_business_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger que se ejecuta después de INSERT, UPDATE o DELETE en business_photos
CREATE TRIGGER sync_business_main_image_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.business_photos
FOR EACH ROW
EXECUTE FUNCTION public.sync_business_main_image();