-- Add RLS policies for order_items to allow clients and company admins to manage order items

-- 1. Allow clients to insert items for their own orders
CREATE POLICY "Clients can insert items for own orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = orders.client_id
      AND clients.user_id = auth.uid()
    )
  )
);

-- 2. Allow company admins to insert items for tenant orders
CREATE POLICY "Company admins can insert items for tenant orders"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = orders.tenant_id
      AND public.has_role(auth.uid(), 'company_admin'::app_role)
    )
  )
);

-- 3. Allow company admins to update tenant order items
CREATE POLICY "Company admins can update tenant order items"
ON public.order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = orders.tenant_id
      AND public.has_role(auth.uid(), 'company_admin'::app_role)
    )
  )
);

-- 4. Allow company admins to delete tenant order items
CREATE POLICY "Company admins can delete tenant order items"
ON public.order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = orders.tenant_id
      AND public.has_role(auth.uid(), 'company_admin'::app_role)
    )
  )
);