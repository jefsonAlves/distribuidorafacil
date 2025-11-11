-- =====================================================
-- CRIAÇÃO DE ADMIN MASTER SEM TOKEN
-- =====================================================
-- Este script cria ou atualiza o usuário admin master
-- Email: admin@wathilibo.com.br
-- Senha: AdminMaster2025!
-- =====================================================

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@wathilibo.com.br';
  v_password text := 'AdminMaster2025!';
  v_full_name text := 'Admin Master Wathilibo';
BEGIN
  -- Tentar criar usuário no auth.users
  -- Se já existir, pegará o ID existente
  BEGIN
    INSERT INTO auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change,
      role,
      instance_id
    ) VALUES (
      gen_random_uuid(),
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', v_full_name, 'user_type', 'admin_master'),
      now(),
      now(),
      '',
      '',
      '',
      '',
      'authenticated',
      '00000000-0000-0000-0000-000000000000'
    )
    RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Novo usuário criado: %', v_user_id;
    
  EXCEPTION WHEN unique_violation THEN
    -- Usuário já existe, pegar ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    -- Atualizar senha
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = now(),
      updated_at = now()
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Usuário existente atualizado: %', v_user_id;
  END;

  -- Garantir profile
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (v_user_id, v_email, v_full_name, 'admin_master')
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    user_type = EXCLUDED.user_type,
    updated_at = now();

  -- Garantir role admin_master
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin_master'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE '✅ Admin master criado/atualizado com sucesso!';
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Senha: %', v_password;
  RAISE NOTICE 'User ID: %', v_user_id;

END $$;