-- Create business_notes table
CREATE TABLE IF NOT EXISTS public.business_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_notes ENABLE ROW LEVEL SECURITY;

-- Business owners can view their notes
CREATE POLICY "Business owners can view their notes"
ON public.business_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Business owners can insert their notes
CREATE POLICY "Business owners can insert their notes"
ON public.business_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Business owners can update their notes
CREATE POLICY "Business owners can update their notes"
ON public.business_notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Business owners can delete their notes
CREATE POLICY "Business owners can delete their notes"
ON public.business_notes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = business_notes.business_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_business_notes_updated_at
BEFORE UPDATE ON public.business_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();