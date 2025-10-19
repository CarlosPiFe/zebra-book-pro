-- Create timesheets table for clock-in/clock-out records
CREATE TABLE IF NOT EXISTS public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.waiters(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  duration_minutes integer,
  note text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create payroll_records table for salary history
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.waiters(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  gross_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid')),
  document_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create employee_notifications table
CREATE TABLE IF NOT EXISTS public.employee_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.waiters(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create shift_change_requests table
CREATE TABLE IF NOT EXISTS public.shift_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.waiters(id) ON DELETE CASCADE NOT NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  schedule_id uuid REFERENCES public.employee_weekly_schedules(id) ON DELETE CASCADE NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_timesheets_employee ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_business ON public.timesheets(business_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(clock_in);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON public.payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_business ON public.payroll_records(business_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON public.employee_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.employee_notifications(read);
CREATE INDEX IF NOT EXISTS idx_shift_requests_employee ON public.shift_change_requests(employee_id);

-- Enable RLS
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timesheets
CREATE POLICY "Employees can view their own timesheets"
ON public.timesheets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = timesheets.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create their own timesheets"
ON public.timesheets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = timesheets.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can update their own timesheets"
ON public.timesheets FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = timesheets.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all timesheets"
ON public.timesheets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = timesheets.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS Policies for payroll_records
CREATE POLICY "Employees can view their own payroll"
ON public.payroll_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = payroll_records.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all payroll"
ON public.payroll_records FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = payroll_records.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS Policies for employee_notifications
CREATE POLICY "Employees can view their own notifications"
ON public.employee_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = employee_notifications.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can update their own notifications"
ON public.employee_notifications FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = employee_notifications.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all notifications"
ON public.employee_notifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = employee_notifications.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- RLS Policies for shift_change_requests
CREATE POLICY "Employees can view their own shift change requests"
ON public.shift_change_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = shift_change_requests.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Employees can create their own shift change requests"
ON public.shift_change_requests FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.waiters
    WHERE waiters.id = shift_change_requests.employee_id
    AND waiters.user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can manage all shift change requests"
ON public.shift_change_requests FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = shift_change_requests.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_timesheets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_timesheets_updated_at
BEFORE UPDATE ON public.timesheets
FOR EACH ROW
EXECUTE FUNCTION public.update_timesheets_updated_at();

CREATE TRIGGER update_payroll_records_updated_at
BEFORE UPDATE ON public.payroll_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to calculate duration when clocking out
CREATE OR REPLACE FUNCTION public.calculate_timesheet_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    NEW.duration_minutes = EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_timesheet_duration
BEFORE INSERT OR UPDATE ON public.timesheets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_timesheet_duration();