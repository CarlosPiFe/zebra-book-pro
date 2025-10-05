-- Create employee_schedules table
CREATE TABLE public.employee_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for employee schedules
CREATE POLICY "Business owners can manage their employee schedules"
ON public.employee_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.waiters
    JOIN public.businesses ON businesses.id = waiters.business_id
    WHERE waiters.id = employee_schedules.employee_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Create index for better performance
CREATE INDEX idx_employee_schedules_employee_id ON public.employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_day_of_week ON public.employee_schedules(day_of_week);