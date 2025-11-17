-- Fase 1: Correções Críticas no Banco de Dados

-- 1.1. Adicionar UNIQUE constraint em clients.user_id
ALTER TABLE public.clients 
ADD CONSTRAINT clients_user_id_unique UNIQUE (user_id);

-- 1.2. Criar função para auto-criar clientes quando role 'client' é atribuída
CREATE OR REPLACE FUNCTION public.auto_create_client_on_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data RECORD;
BEGIN
  -- Verificar se a role inserida é 'client'
  IF NEW.role = 'client' THEN
    -- Buscar dados do perfil
    SELECT id, email, full_name, phone, cpf, tenant_id
    INTO profile_data
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Inserir ou atualizar registro em clients
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
  
  RETURN NEW;
END;
$$;

-- 1.3. Criar trigger para auto-criar clientes
DROP TRIGGER IF EXISTS trigger_auto_create_client ON public.user_roles;

CREATE TRIGGER trigger_auto_create_client
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_client_on_role();

-- 1.4. Backfill: Criar registros de clientes para usuários existentes com role 'client'
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
WHERE ur.role = 'client'
ON CONFLICT (user_id) DO NOTHING;