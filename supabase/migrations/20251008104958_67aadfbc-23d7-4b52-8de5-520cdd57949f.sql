-- Remove the overly permissive SELECT policy on waiters table
DROP POLICY IF EXISTS "Waiters can view themselves by token" ON public.waiters;

-- Create a secure function to get waiter by token
-- This function uses SECURITY DEFINER to bypass RLS and only returns the specific waiter
CREATE OR REPLACE FUNCTION public.get_waiter_by_token(_token text)
RETURNS TABLE (
  id uuid,
  name text,
  business_id uuid,
  token text,
  "position" text,
  is_active boolean,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    name,
    business_id,
    token,
    "position",
    is_active,
    created_at
  FROM public.waiters
  WHERE token = _token
  AND is_active = true
  LIMIT 1;
$$;

-- Grant execute permission to anonymous users (for unauthenticated waiter access)
GRANT EXECUTE ON FUNCTION public.get_waiter_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_waiter_by_token(text) TO authenticated;