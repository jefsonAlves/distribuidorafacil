-- 1. Atualizar trigger handle_new_user para NÃO criar driver automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- Inserir perfil base
  INSERT INTO public.profiles (id, email, full_name, user_type, phone, cpf, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  CASE NEW.raw_user_meta_data->>'user_type'
    
    WHEN 'company' THEN
      INSERT INTO public.tenants (name, cnpj, email, phone, status)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Nova Empresa'),
        COALESCE(NEW.raw_user_meta_data->>'cnpj', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'ACTIVE'
      )
      RETURNING id INTO new_tenant_id;
      
      UPDATE public.profiles 
      SET tenant_id = new_tenant_id 
      WHERE id = NEW.id;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'company_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    WHEN 'driver' THEN
      -- Apenas cria role driver, registro em drivers será criado via Edge Function
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'driver'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    ELSE
      INSERT INTO public.clients (user_id, full_name, email, phone, cpf)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', '')
      )
      ON CONFLICT DO NOTHING;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'client'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- 2. Política para drivers atualizarem próprio perfil
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;
CREATE POLICY "Drivers can update own profile"
ON public.drivers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Política para company_admin inserir drivers
DROP POLICY IF EXISTS "Company admins can insert drivers" ON public.drivers;
CREATE POLICY "Company admins can insert drivers"
ON public.drivers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = drivers.tenant_id
  )
  AND public.has_role(auth.uid(), 'company_admin'::app_role)
);