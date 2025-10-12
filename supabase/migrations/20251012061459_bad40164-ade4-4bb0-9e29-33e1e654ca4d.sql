-- Add auto_mark_in_progress field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS auto_mark_in_progress boolean DEFAULT true;