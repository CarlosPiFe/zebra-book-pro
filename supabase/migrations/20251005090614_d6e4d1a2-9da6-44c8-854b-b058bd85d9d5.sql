-- Add position column to waiters table
ALTER TABLE public.waiters
ADD COLUMN position TEXT;

-- Add comment to the column
COMMENT ON COLUMN public.waiters.position IS 'Optional job position/role for the employee (e.g., Cocinero, Gerente, Cajero)';