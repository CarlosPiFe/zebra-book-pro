-- Add booking automation configuration to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS auto_complete_in_progress boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_complete_delayed boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS mark_delayed_as_no_show boolean DEFAULT false;

COMMENT ON COLUMN public.businesses.auto_complete_in_progress IS 'Marca automáticamente reservas en curso como completadas cuando finaliza su tiempo';
COMMENT ON COLUMN public.businesses.auto_complete_delayed IS 'Marca automáticamente reservas en retraso como completadas cuando finaliza su tiempo';
COMMENT ON COLUMN public.businesses.mark_delayed_as_no_show IS 'Marca reservas en retraso como no asistido (en lugar de completada) cuando finaliza su tiempo';