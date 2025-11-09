-- Create customer_notes table to store business ratings and notes about their customers
CREATE TABLE IF NOT EXISTS public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to ensure one note per customer per business
CREATE UNIQUE INDEX IF NOT EXISTS customer_notes_business_email_unique 
ON public.customer_notes(business_id, client_email) 
WHERE client_email IS NOT NULL;

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view their customer notes
CREATE POLICY "Business owners can view their customer notes"
ON public.customer_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = customer_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Policy: Business owners can insert customer notes
CREATE POLICY "Business owners can insert their customer notes"
ON public.customer_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = customer_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Policy: Business owners can update their customer notes
CREATE POLICY "Business owners can update their customer notes"
ON public.customer_notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = customer_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Policy: Business owners can delete their customer notes
CREATE POLICY "Business owners can delete their customer notes"
ON public.customer_notes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = customer_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_customer_notes_updated_at
BEFORE UPDATE ON public.customer_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();