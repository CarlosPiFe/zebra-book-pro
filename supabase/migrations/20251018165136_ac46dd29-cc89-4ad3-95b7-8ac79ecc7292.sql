-- Add min_capacity column to tables
ALTER TABLE public.tables 
ADD COLUMN min_capacity integer;

-- Set default min_capacity to 1 for existing tables
UPDATE public.tables 
SET min_capacity = 1 
WHERE min_capacity IS NULL;

-- Make min_capacity NOT NULL after setting defaults
ALTER TABLE public.tables 
ALTER COLUMN min_capacity SET NOT NULL;

-- Set default value for future inserts
ALTER TABLE public.tables 
ALTER COLUMN min_capacity SET DEFAULT 1;

-- Add check constraint to ensure min_capacity is positive and <= max_capacity
ALTER TABLE public.tables 
ADD CONSTRAINT check_capacity_range 
CHECK (min_capacity > 0 AND min_capacity <= max_capacity);