-- =====================================================
-- SISTEMA DE CONTROLE DE ACESSO
-- =====================================================
-- Adiciona campo is_active em profiles para controlar
-- se um usuário pode ou não acessar o sistema
-- =====================================================

-- 1. Adicionar campo is_active em profiles (default true)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- 2. Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_active 
ON public.profiles(tenant_id, is_active);

-- 3. Adicionar índices para melhorar performance de queries do admin
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status 
ON public.orders(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_delivered_date 
ON public.orders(delivered_at) 
WHERE status = 'ENTREGUE';

CREATE INDEX IF NOT EXISTS idx_orders_tenant_created 
ON public.orders(tenant_id, created_at DESC);

-- 4. Função helper para verificar se usuário está ativo
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, true) 
  FROM public.profiles 
  WHERE id = _user_id;
$$;

-- 5. Comentários para documentação
COMMENT ON COLUMN public.profiles.is_active IS 
'Indica se o usuário está ativo e pode acessar o sistema. Admin master pode desativar usuários.';

COMMENT ON FUNCTION public.is_user_active IS 
'Verifica se um usuário está ativo no sistema. Retorna true se ativo ou se não encontrado (para compatibilidade).';

-- =====================================================
-- NOTA: As policies RLS serão atualizadas conforme necessário
-- para bloquear usuários inativos em operações críticas
-- =====================================================