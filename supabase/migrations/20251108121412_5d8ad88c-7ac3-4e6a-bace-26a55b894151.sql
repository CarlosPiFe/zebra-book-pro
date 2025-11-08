-- Añadir campo SEO keywords a businesses
ALTER TABLE public.businesses
ADD COLUMN seo_keywords TEXT;

COMMENT ON COLUMN public.businesses.seo_keywords IS 'Palabras clave y descripciones para mejorar búsquedas con IA. No visible en UI pública.';