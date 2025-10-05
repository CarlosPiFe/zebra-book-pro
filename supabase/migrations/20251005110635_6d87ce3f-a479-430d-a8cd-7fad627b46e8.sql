-- Create calendar events table
CREATE TABLE public.calendar_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_time TIME WITHOUT TIME ZONE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Business owners can view their calendar events"
ON public.calendar_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM businesses
  WHERE businesses.id = calendar_events.business_id
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Business owners can create their calendar events"
ON public.calendar_events
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM businesses
  WHERE businesses.id = calendar_events.business_id
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Business owners can update their calendar events"
ON public.calendar_events
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM businesses
  WHERE businesses.id = calendar_events.business_id
  AND businesses.owner_id = auth.uid()
));

CREATE POLICY "Business owners can delete their calendar events"
ON public.calendar_events
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM businesses
  WHERE businesses.id = calendar_events.business_id
  AND businesses.owner_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_calendar_events_business_date 
ON public.calendar_events(business_id, event_date);