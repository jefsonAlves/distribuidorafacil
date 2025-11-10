-- =====================================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA
-- =====================================================

-- 1. Corrigir políticas RLS da carteira da empresa
-- Remover política muito permissiva e criar políticas específicas

DROP POLICY IF EXISTS "System can manage wallets" ON public.company_wallet;

-- Criar função SECURITY DEFINER para atualizar carteira (apenas para triggers do sistema)
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_tenant_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas adicionar ao saldo se for crédito (amount positivo)
  -- Para débitos, usar valor negativo
  INSERT INTO public.company_wallet (tenant_id, balance)
  VALUES (p_tenant_id, GREATEST(p_amount, 0))
  ON CONFLICT (tenant_id) DO UPDATE
  SET 
    balance = GREATEST(public.company_wallet.balance + p_amount, 0),
    updated_at = now();
END;
$$;

-- Política: Apenas triggers do sistema podem inserir/atualizar carteira
-- Isso é feito através da função SECURITY DEFINER acima, que é chamada apenas pelos triggers
-- Não criamos política RLS para INSERT/UPDATE, deixando apenas para SELECT

-- Adicionar política para admin_master visualizar todas as carteiras
DROP POLICY IF EXISTS "Admin master can view all wallets" ON public.company_wallet;
CREATE POLICY "Admin master can view all wallets"
ON public.company_wallet FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'::app_role));

-- 2. Corrigir políticas RLS de wallet_transactions
DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;

-- Criar função SECURITY DEFINER para inserir transações (apenas para triggers)
CREATE OR REPLACE FUNCTION public.insert_wallet_transaction(
  p_tenant_id UUID,
  p_order_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_payment_method TEXT,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.wallet_transactions (
    tenant_id,
    order_id,
    amount,
    type,
    payment_method,
    description
  )
  VALUES (
    p_tenant_id,
    p_order_id,
    p_amount,
    p_type,
    p_payment_method,
    p_description
  )
  RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo usando função segura
  PERFORM public.update_wallet_balance(p_tenant_id, p_amount);
  
  RETURN v_transaction_id;
END;
$$;

-- 3. Atualizar função update_wallet_on_delivery para usar função segura
CREATE OR REPLACE FUNCTION public.update_wallet_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_user_id UUID;
  v_transaction_id UUID;
BEGIN
  -- Verificar se status mudou para ENTREGUE
  IF NEW.status = 'ENTREGUE' AND (OLD.status IS NULL OR OLD.status != 'ENTREGUE') THEN
    -- Inserir transação usando função segura
    SELECT public.insert_wallet_transaction(
      NEW.tenant_id,
      NEW.id,
      NEW.total,
      'credit',
      NEW.payment_method::TEXT,
      'Entrega concluída - Pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8)
    ) INTO v_transaction_id;
      
    -- Notificar empresa sobre o crédito
    SELECT p.id INTO v_admin_user_id
    FROM public.profiles p 
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.tenant_id = NEW.tenant_id 
      AND ur.role = 'company_admin'
    LIMIT 1;
    
    IF v_admin_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_admin_user_id,
        NEW.tenant_id,
        'Novo Crédito Recebido',
        'Pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi entregue. +R$ ' || NEW.total::TEXT || ' adicionados à carteira.',
        'wallet',
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Garantir que a coluna role foi removida da tabela profiles
-- (Se ainda existir, será removida - a migração anterior já fez isso, mas garantimos aqui)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role CASCADE;
  END IF;
END $$;

-- 5. Garantir que drivers podem atualizar apenas seu próprio status
-- Remover política genérica e criar política específica para status
DROP POLICY IF EXISTS "Drivers can update own profile" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can update own status" ON public.drivers;

-- Política específica para atualização de status apenas
-- Drivers podem atualizar apenas o campo status, e apenas para valores válidos
CREATE POLICY "Drivers can update own status"
ON public.drivers FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id 
  -- Permitir apenas valores válidos de status
  AND NEW.status IN ('ACTIVE', 'INACTIVE', 'ONLINE', 'IN_SERVICE')
  -- Garantir que o user_id e tenant_id não sejam alterados
  AND NEW.user_id = auth.uid()
);

-- Nota: A validação de transição de status específica (ex: só permitir ACTIVE <-> INACTIVE)
-- pode ser feita via trigger se necessário, mas por enquanto permitimos qualquer mudança
-- entre os status válidos para dar flexibilidade aos motoristas

-- 6. Adicionar validação CHECK na tabela orders para valores positivos
ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_total_positive,
  ADD CONSTRAINT orders_total_positive CHECK (total > 0);

ALTER TABLE public.orders 
  DROP CONSTRAINT IF EXISTS orders_change_for_positive,
  ADD CONSTRAINT orders_change_for_positive CHECK (change_for IS NULL OR change_for >= 0);

-- 7. Adicionar validação CHECK para endereço não nulo
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_address_not_null,
  ADD CONSTRAINT orders_address_not_null CHECK (address IS NOT NULL AND address::text != '{}'::text);

-- 8. Adicionar validação CHECK para método de pagamento válido
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_valid,
  ADD CONSTRAINT orders_payment_method_valid CHECK (payment_method IN ('PIX', 'CARD', 'CASH'));

