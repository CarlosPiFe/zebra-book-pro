-- Add color field to waiters table
ALTER TABLE public.waiters 
ADD COLUMN color TEXT DEFAULT '#3b82f6';