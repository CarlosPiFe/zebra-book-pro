-- Añadir campo email a la tabla waiters para portal de empleado
ALTER TABLE public.waiters ADD COLUMN email text;

-- Crear índice para búsquedas rápidas por email
CREATE INDEX idx_waiters_email ON public.waiters(email) WHERE email IS NOT NULL;

-- Añadir comentario explicativo
COMMENT ON COLUMN public.waiters.email IS 'Correo electrónico del empleado para acceder al Portal de Empleado';