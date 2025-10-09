-- Add website and social media fields to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS social_media JSONB DEFAULT '{}'::jsonb;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.businesses.website IS 'URL del sitio web oficial del negocio';
COMMENT ON COLUMN public.businesses.social_media IS 'JSON con enlaces a redes sociales (facebook, instagram, twitter, etc.)';