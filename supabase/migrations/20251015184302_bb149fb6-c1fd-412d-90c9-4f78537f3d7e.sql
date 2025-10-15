-- Crear tabla para salas personalizadas del negocio
CREATE TABLE public.business_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  time_slots jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_rooms ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Business owners can view their rooms"
ON public.business_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_rooms.business_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can insert their rooms"
ON public.business_rooms
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_rooms.business_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their rooms"
ON public.business_rooms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_rooms.business_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their rooms"
ON public.business_rooms
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_rooms.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_business_rooms_updated_at
  BEFORE UPDATE ON public.business_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();