-- Create employee_schedules table for weekly schedules
CREATE TABLE public.employee_weekly_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  morning_start TIME,
  morning_end TIME,
  afternoon_start TIME,
  afternoon_end TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_employee_date UNIQUE(employee_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.employee_weekly_schedules ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to manage their employee schedules
CREATE POLICY "Business owners can manage their employee weekly schedules"
ON public.employee_weekly_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    JOIN public.businesses ON businesses.id = waiters.business_id
    WHERE waiters.id = employee_weekly_schedules.employee_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX idx_employee_weekly_schedules_employee_id ON public.employee_weekly_schedules(employee_id);
CREATE INDEX idx_employee_weekly_schedules_date ON public.employee_weekly_schedules(date);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_employee_weekly_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_employee_weekly_schedules_updated_at
BEFORE UPDATE ON public.employee_weekly_schedules
FOR EACH ROW
EXECUTE FUNCTION update_employee_weekly_schedules_updated_at();