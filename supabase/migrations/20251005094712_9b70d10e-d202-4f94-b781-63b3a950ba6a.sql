-- Modify employee_weekly_schedules to support multiple time slots per day
-- First, drop the unique constraint
ALTER TABLE public.employee_weekly_schedules 
DROP CONSTRAINT IF EXISTS unique_employee_date;

-- Drop the old columns
ALTER TABLE public.employee_weekly_schedules 
DROP COLUMN IF EXISTS morning_start,
DROP COLUMN IF EXISTS morning_end,
DROP COLUMN IF EXISTS afternoon_start,
DROP COLUMN IF EXISTS afternoon_end;

-- Add new columns for single time slots
ALTER TABLE public.employee_weekly_schedules 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;

-- Add a slot_order column to maintain order of slots
ALTER TABLE public.employee_weekly_schedules 
ADD COLUMN slot_order INTEGER DEFAULT 1;

-- Update the table to ensure is_day_off entries don't have times
UPDATE public.employee_weekly_schedules 
SET start_time = NULL, end_time = NULL 
WHERE is_day_off = true;