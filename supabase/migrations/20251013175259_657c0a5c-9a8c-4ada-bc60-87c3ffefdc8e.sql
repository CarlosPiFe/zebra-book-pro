-- Add schedule_view_mode column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN schedule_view_mode text NOT NULL DEFAULT 'editable' 
CHECK (schedule_view_mode IN ('editable', 'visual'));