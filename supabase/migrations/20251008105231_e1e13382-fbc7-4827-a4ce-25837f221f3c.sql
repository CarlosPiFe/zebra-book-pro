-- Allow public read access to tables (non-sensitive data needed by waiters)
CREATE POLICY "Anyone can view tables"
ON public.tables
FOR SELECT
TO public
USING (true);

-- Allow public read access to menu items (non-sensitive data needed by waiters)
CREATE POLICY "Anyone can view menu items"
ON public.menu_items
FOR SELECT
TO public
USING (true);