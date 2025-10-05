-- Drop the insecure public policy
DROP POLICY IF EXISTS "Anyone can view active businesses" ON businesses;

-- Create a secure function that returns only public business information
CREATE OR REPLACE FUNCTION public.get_public_businesses()
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  description TEXT,
  address TEXT,
  image_url TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    id,
    name,
    category,
    description,
    address,
    image_url,
    is_active,
    created_at,
    updated_at
  FROM public.businesses
  WHERE is_active = true;
$$;

-- Grant execute permission to public
GRANT EXECUTE ON FUNCTION public.get_public_businesses() TO public;

-- Add comment explaining the security measure
COMMENT ON FUNCTION public.get_public_businesses() IS 
'Returns only non-sensitive business information for public viewing. Email and phone are excluded to protect business owners from spam and harassment.';