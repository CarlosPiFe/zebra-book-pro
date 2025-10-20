-- Add RLS policy to allow employees to view their own weekly schedules
CREATE POLICY "Employees can view their own weekly schedules"
ON employee_weekly_schedules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM waiters 
    WHERE waiters.id = employee_weekly_schedules.employee_id 
    AND waiters.email = (auth.jwt()->>'email')
    AND waiters.is_active = true
  )
);

-- Add RLS policy to allow employees to view their vacations
CREATE POLICY "Employees can view their own vacations"
ON employee_vacations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM waiters 
    WHERE waiters.id = employee_vacations.employee_id 
    AND waiters.email = (auth.jwt()->>'email')
    AND waiters.is_active = true
  )
);