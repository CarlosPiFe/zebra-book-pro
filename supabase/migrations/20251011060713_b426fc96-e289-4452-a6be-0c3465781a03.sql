-- Add business-specific API tokens for secure VAPI integration
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS api_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Create index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_businesses_api_token ON public.businesses(api_token);

-- Add rate limiting table for API endpoints
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, endpoint, window_start)
);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only business owners can view their rate limits
CREATE POLICY "Business owners can view their rate limits"
ON public.api_rate_limits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = api_rate_limits.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Create function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_business_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := DATE_TRUNC('hour', NOW());
  
  -- Get or create rate limit record
  INSERT INTO api_rate_limits (business_id, endpoint, window_start, request_count)
  VALUES (p_business_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (business_id, endpoint, window_start)
  DO UPDATE SET request_count = api_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;
  
  -- Clean up old records
  DELETE FROM api_rate_limits 
  WHERE window_start < NOW() - INTERVAL '24 hours';
  
  RETURN v_count <= p_max_requests;
END;
$$;