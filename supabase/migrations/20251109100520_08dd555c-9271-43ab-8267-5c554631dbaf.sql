-- 1. Tornar tenant_id obrigatório para clientes
ALTER TABLE public.clients 
ALTER COLUMN tenant_id SET NOT NULL;

-- Adicionar foreign key se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'clients_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_tenant_id_fkey 
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON public.clients(tenant_id);

-- 2. Criar RLS Policy permitindo clientes visualizarem sua empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenants' AND policyname = 'Clients can view their tenant'
  ) THEN
    CREATE POLICY "Clients can view their tenant"
    ON public.tenants
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.tenant_id = tenants.id
        AND clients.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 3. Atualizar RLS Policy de produtos
DROP POLICY IF EXISTS "Clients can view active products" ON public.products;

-- Criar nova policy correta
CREATE POLICY "Clients can view products of their tenant"
ON public.products
FOR SELECT
TO authenticated
USING (
  active = true 
  AND EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.tenant_id = products.tenant_id
    AND clients.user_id = auth.uid()
  )
);

-- 4. Adicionar campo 'slug' na tabela tenants para URLs personalizadas (Opção A)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS slug text;

-- Adicionar unique constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_slug_key'
  ) THEN
    ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Criar índice para o slug
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);

-- Comentário explicativo
COMMENT ON COLUMN public.tenants.slug IS 'URL slug único para identificar a empresa (ex: empresa-abc para URL /empresa-abc/cadastro)';