-- Create employee_vacations table
CREATE TABLE public.employee_vacations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.waiters(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Enable Row Level Security
ALTER TABLE public.employee_vacations ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to manage their employee vacations
CREATE POLICY "Business owners can manage their employee vacations"
ON public.employee_vacations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    JOIN public.businesses ON businesses.id = waiters.business_id
    WHERE waiters.id = employee_vacations.employee_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Add index for better performance
CREATE INDEX idx_employee_vacations_employee_id ON public.employee_vacations(employee_id);
CREATE INDEX idx_employee_vacations_dates ON public.employee_vacations(start_date, end_date);