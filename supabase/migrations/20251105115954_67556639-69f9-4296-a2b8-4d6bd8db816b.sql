-- Criar primeiro usuário admin_master
-- IMPORTANTE: Esta migration cria o usuário admin inicial do sistema

-- Inserir admin_master na tabela profiles (assumindo que o usuário já existe no auth.users)
-- O admin precisa primeiro fazer signup manual em /auth/register e depois rodar esta migration
-- OU podemos criar via função especial

-- Criar função para facilitar criação de admin
CREATE OR REPLACE FUNCTION public.create_admin_master(
  p_email text,
  p_full_name text DEFAULT 'Admin Master'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Buscar user_id baseado no email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. Faça o cadastro primeiro.', p_email;
  END IF;
  
  -- Inserir/atualizar profile
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (admin_user_id, p_email, p_full_name, 'admin_master')
  ON CONFLICT (id) DO UPDATE
  SET user_type = 'admin_master',
      full_name = EXCLUDED.full_name;
  
  -- Inserir role admin_master
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin_master'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN admin_user_id;
END;
$$;

-- Comentário de uso:
COMMENT ON FUNCTION public.create_admin_master IS 
'Uso: SELECT create_admin_master(''admin@deliverypro.com'', ''Jeffson Admin'');
Primeiro cadastre o usuário em /auth/register, depois execute esta função com o email cadastrado.';