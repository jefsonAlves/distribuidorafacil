-- ========================================
-- FASE 1: Correção Imediata do Usuário Órfão
-- ========================================

-- 1.1. Corrigir usuário específico jefson.clientemarques2@gmail.com
-- Criar profile primeiro
INSERT INTO public.profiles (id, email, full_name, phone, cpf, user_type, tenant_id, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'cpf', ''),
  COALESCE(u.raw_user_meta_data->>'user_type', 'client'),
  (SELECT id FROM public.tenants WHERE name = 'Marques Gás' LIMIT 1),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'jefson.clientemarques2@gmail.com'
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  cpf = EXCLUDED.cpf,
  user_type = EXCLUDED.user_type,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

-- Criar registro de cliente
INSERT INTO public.clients (user_id, email, full_name, phone, cpf, tenant_id, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'cpf', ''),
  (SELECT id FROM public.tenants WHERE name = 'Marques Gás' LIMIT 1),
  now(),
  now()
FROM auth.users u
WHERE u.email = 'jefson.clientemarques2@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  cpf = EXCLUDED.cpf,
  tenant_id = EXCLUDED.tenant_id,
  updated_at = now();

-- ========================================
-- FASE 2: Melhorar Trigger com Fallback
-- ========================================

-- 2.1. Função auxiliar para encontrar tenant_id apropriado
CREATE OR REPLACE FUNCTION public.find_default_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Buscar primeira empresa ativa
  SELECT id INTO default_tenant_id
  FROM public.tenants
  WHERE status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN default_tenant_id;
END;
$$;

-- 2.2. Melhorar função auto_create_client_on_role com fallback para auth.users
CREATE OR REPLACE FUNCTION public.auto_create_client_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data RECORD;
  auth_data RECORD;
  target_tenant_id uuid;
BEGIN
  -- Verificar se a role inserida é 'client'
  IF NEW.role = 'client' THEN
    
    -- STEP 1: Tentar buscar dados do perfil
    SELECT id, email, full_name, phone, cpf, tenant_id
    INTO profile_data
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- STEP 2: Se profile não existir, buscar de auth.users e criar profile
    IF profile_data IS NULL THEN
      -- Buscar dados de auth.users
      SELECT 
        id,
        email,
        raw_user_meta_data->>'full_name' as full_name,
        raw_user_meta_data->>'phone' as phone,
        raw_user_meta_data->>'cpf' as cpf,
        raw_user_meta_data->>'user_type' as user_type
      INTO auth_data
      FROM auth.users
      WHERE id = NEW.user_id;
      
      IF auth_data IS NOT NULL THEN
        -- Determinar tenant_id: buscar de metadata ou usar default
        target_tenant_id := COALESCE(
          (SELECT id FROM public.tenants WHERE slug = auth_data.user_type LIMIT 1),
          public.find_default_tenant_id()
        );
        
        -- Criar profile automaticamente
        INSERT INTO public.profiles (id, email, full_name, phone, cpf, user_type, tenant_id, created_at, updated_at)
        VALUES (
          auth_data.id,
          auth_data.email,
          COALESCE(auth_data.full_name, ''),
          COALESCE(auth_data.phone, ''),
          COALESCE(auth_data.cpf, ''),
          COALESCE(auth_data.user_type, 'client'),
          target_tenant_id,
          now(),
          now()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          cpf = EXCLUDED.cpf,
          tenant_id = EXCLUDED.tenant_id,
          updated_at = now();
        
        -- Atualizar profile_data para usar na criação do client
        SELECT id, email, full_name, phone, cpf, tenant_id
        INTO profile_data
        FROM public.profiles
        WHERE id = NEW.user_id;
      ELSE
        RAISE WARNING 'Usuário % não encontrado em auth.users', NEW.user_id;
        RETURN NEW;
      END IF;
    END IF;
    
    -- STEP 3: Criar ou atualizar registro em clients
    IF profile_data IS NOT NULL THEN
      INSERT INTO public.clients (user_id, email, full_name, phone, cpf, tenant_id, created_at, updated_at)
      VALUES (
        profile_data.id,
        profile_data.email,
        COALESCE(profile_data.full_name, ''),
        COALESCE(profile_data.phone, ''),
        COALESCE(profile_data.cpf, ''),
        profile_data.tenant_id,
        now(),
        now()
      )
      ON CONFLICT (user_id) DO UPDATE
      SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = EXCLUDED.phone,
        cpf = EXCLUDED.cpf,
        tenant_id = EXCLUDED.tenant_id,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ========================================
-- FASE 3: Auditoria e Backfill Geral
-- ========================================

-- 3.1. Backfill de usuários órfãos com role 'client' mas sem profile
INSERT INTO public.profiles (id, email, full_name, phone, cpf, user_type, tenant_id, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  COALESCE(u.raw_user_meta_data->>'cpf', ''),
  COALESCE(u.raw_user_meta_data->>'user_type', 'client'),
  public.find_default_tenant_id(),
  now(),
  now()
FROM auth.users u
INNER JOIN public.user_roles ur ON ur.user_id = u.id
LEFT JOIN public.profiles p ON p.id = u.id
WHERE ur.role = 'client'
  AND p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 3.2. Backfill de clientes órfãos (têm profile mas não têm registro em clients)
INSERT INTO public.clients (user_id, email, full_name, phone, cpf, tenant_id, created_at, updated_at)
SELECT 
  p.id,
  p.email,
  COALESCE(p.full_name, ''),
  COALESCE(p.phone, ''),
  COALESCE(p.cpf, ''),
  p.tenant_id,
  now(),
  now()
FROM public.profiles p
INNER JOIN public.user_roles ur ON ur.user_id = p.id
LEFT JOIN public.clients c ON c.user_id = p.id
WHERE ur.role = 'client'
  AND c.id IS NULL
ON CONFLICT (user_id) DO NOTHING;