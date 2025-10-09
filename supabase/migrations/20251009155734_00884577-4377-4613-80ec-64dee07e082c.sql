-- Add color column to calendar_events table
ALTER TABLE public.calendar_events
ADD COLUMN color text NOT NULL DEFAULT '#3b82f6';