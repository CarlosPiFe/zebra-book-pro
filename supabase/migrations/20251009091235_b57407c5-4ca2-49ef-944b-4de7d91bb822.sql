-- Fix #1: User Roles Privilege Escalation
-- Create app_role enum for the new roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'client');

-- Create user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only system can insert/update/delete roles (no direct user modification)
-- Admins would need a separate admin function to grant roles

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::text::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop the old UPDATE policy on profiles that allowed role modification
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new UPDATE policy on profiles that excludes the role column
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevent role changes
);

-- Fix #4: Waiter Order Creation Authorization
-- Create function to validate waiter can access table
CREATE OR REPLACE FUNCTION public.waiter_can_access_table(_waiter_id uuid, _table_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.waiters w
    JOIN public.tables t ON t.business_id = w.business_id
    WHERE w.id = _waiter_id 
      AND t.id = _table_id
      AND w.is_active = true
  )
$$;

-- Drop the insecure orders INSERT policy
DROP POLICY IF EXISTS "Waiters can create orders" ON public.orders;

-- Create secure orders INSERT policy that validates waiter-business-table relationship
CREATE POLICY "Verified waiters can create orders for their business tables"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  waiter_id IS NOT NULL 
  AND public.waiter_can_access_table(waiter_id, table_id)
);