-- Add layout fields to tables for canvas positioning
ALTER TABLE public.tables
ADD COLUMN IF NOT EXISTS position_x NUMERIC,
ADD COLUMN IF NOT EXISTS position_y NUMERIC,
ADD COLUMN IF NOT EXISTS rotation NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS width NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS height NUMERIC DEFAULT 100,
ADD COLUMN IF NOT EXISTS element_type TEXT DEFAULT 'table-square',
ADD COLUMN IF NOT EXISTS assigned_waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL;

-- Add comment for element types
COMMENT ON COLUMN public.tables.element_type IS 'Types: table-square, table-round, chair, sofa, wall';

-- Create index for faster queries by room
CREATE INDEX IF NOT EXISTS idx_tables_room_id ON public.tables(room_id);
CREATE INDEX IF NOT EXISTS idx_tables_assigned_waiter ON public.tables(assigned_waiter_id);