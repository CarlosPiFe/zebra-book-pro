-- Add RLS policy to allow employees to view their own records by email
CREATE POLICY "Employees can view their own records by email"
ON waiters
FOR SELECT
USING (email = (auth.jwt()->>'email') AND is_active = true);