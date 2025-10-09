-- Complete the role privilege escalation fix

-- 1. Update handle_new_user() function to only insert into user_roles, not profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles (WITHOUT role column)
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Insert into user_roles (secure table with RLS)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the insecure UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;

-- 3. Create a new UPDATE policy that doesn't reference role
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Drop the role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;