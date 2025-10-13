-- Función para limpiar registros antiguos de horarios (más de 2 años)
CREATE OR REPLACE FUNCTION public.cleanup_old_schedules()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eliminar horarios semanales con más de 2 años
  DELETE FROM public.employee_weekly_schedules
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Eliminar horarios regulares con más de 2 años
  DELETE FROM public.employee_schedules
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$;

-- Crear una tabla para registrar la última limpieza (opcional, para logs)
CREATE TABLE IF NOT EXISTS public.schedule_cleanup_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaned_at timestamp with time zone DEFAULT now(),
  records_deleted integer
);

-- Comentario explicativo
COMMENT ON FUNCTION public.cleanup_old_schedules IS 'Elimina automáticamente los horarios de empleados con más de 2 años de antigüedad';