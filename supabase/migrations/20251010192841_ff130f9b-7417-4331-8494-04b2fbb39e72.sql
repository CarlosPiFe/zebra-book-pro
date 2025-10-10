-- Fix security definer functions to add authentication checks

-- First, add user_id column to waiters table if it doesn't exist (for linking waiters to auth users)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'waiters' AND column_name = 'user_id') THEN
    ALTER TABLE public.waiters ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Update waiter_can_access_table function to validate caller identity
CREATE OR REPLACE FUNCTION public.waiter_can_access_table(_waiter_id uuid, _table_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller owns this waiter account (if user_id is set)
  IF EXISTS (SELECT 1 FROM waiters WHERE id = _waiter_id AND user_id IS NOT NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM waiters 
      WHERE id = _waiter_id 
      AND user_id = auth.uid()
    ) THEN
      RETURN false;
    END IF;
  END IF;
  
  -- Then check table access
  RETURN EXISTS (
    SELECT 1 FROM waiters w
    JOIN tables t ON t.business_id = w.business_id
    WHERE w.id = _waiter_id 
      AND t.id = _table_id
      AND w.is_active = true
  );
END;
$$;

-- Fix get_waiter_by_token to set search_path
CREATE OR REPLACE FUNCTION public.get_waiter_by_token(_token text)
RETURNS TABLE(id uuid, name text, business_id uuid, token text, "position" text, is_active boolean, created_at timestamp with time zone)
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

-- Fix get_public_businesses to set search_path (already has it, but ensuring it's explicit)
CREATE OR REPLACE FUNCTION public.get_public_businesses()
RETURNS TABLE(id uuid, name text, category text, description text, address text, image_url text, is_active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Fix set_booking_business_phone function to ensure search_path is set properly
CREATE OR REPLACE FUNCTION public.set_booking_business_phone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the business phone from businesses table
  SELECT phone INTO NEW.business_phone
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column to add search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_employee_weekly_schedules_updated_at to add search_path
CREATE OR REPLACE FUNCTION public.update_employee_weekly_schedules_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;