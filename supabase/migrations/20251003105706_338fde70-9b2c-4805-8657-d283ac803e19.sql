-- Create waiters table for restaurant staff
CREATE TABLE public.waiters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create orders table for tracking menu items ordered per table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  waiter_id UUID REFERENCES public.waiters(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waiters
CREATE POLICY "Business owners can manage their waiters"
ON public.waiters
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = waiters.business_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Waiters can view themselves by token"
ON public.waiters
FOR SELECT
USING (true);

-- RLS Policies for orders
CREATE POLICY "Business owners can view orders for their tables"
ON public.orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = orders.table_id
    AND businesses.owner_id = auth.uid()
  )
);

CREATE POLICY "Waiters can create orders"
ON public.orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Business owners can manage orders for their tables"
ON public.orders
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tables
    JOIN public.businesses ON businesses.id = tables.business_id
    WHERE tables.id = orders.table_id
    AND businesses.owner_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX idx_waiters_token ON public.waiters(token);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);
CREATE INDEX idx_orders_waiter_id ON public.orders(waiter_id);