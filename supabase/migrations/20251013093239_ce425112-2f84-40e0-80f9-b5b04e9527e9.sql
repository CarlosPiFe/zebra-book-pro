-- Habilitar RLS en la tabla de logs de limpieza
ALTER TABLE public.schedule_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Política para que solo los dueños de negocios puedan ver los logs (si fuera necesario)
-- Por ahora, solo admin/sistema puede ver
CREATE POLICY "Solo sistema puede ver logs de limpieza"
ON public.schedule_cleanup_log
FOR SELECT
TO authenticated
USING (false);