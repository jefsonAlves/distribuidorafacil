-- Política para permitir usuários inserir sua própria role 'client'
CREATE POLICY "Users can insert own client role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND role = 'client'::app_role
);

-- Garantir que slug é unique
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);