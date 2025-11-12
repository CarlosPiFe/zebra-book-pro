-- Add latitude and longitude columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_businesses_location ON public.businesses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add comment to explain the columns
COMMENT ON COLUMN public.businesses.latitude IS 'Latitude coordinate of the business location';
COMMENT ON COLUMN public.businesses.longitude IS 'Longitude coordinate of the business location';