-- Function to automatically set business_phone from businesses table
CREATE OR REPLACE FUNCTION public.set_booking_business_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the business phone from businesses table
  SELECT phone INTO NEW.business_phone
  FROM public.businesses
  WHERE id = NEW.business_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to set business_phone on insert or update
CREATE TRIGGER set_booking_business_phone_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_business_phone();

-- Update existing bookings with business phone
UPDATE public.bookings b
SET business_phone = (
  SELECT phone 
  FROM public.businesses 
  WHERE id = b.business_id
)
WHERE business_phone IS NULL;