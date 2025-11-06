-- Criar tabela de carteira da empresa
CREATE TABLE IF NOT EXISTS public.company_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT balance_positive CHECK (balance >= 0)
);

-- Criar tabela de transações da carteira
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  payment_method TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tenant ON public.wallet_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order ON public.wallet_transactions(order_id);

-- Trigger para atualizar updated_at na carteira
CREATE OR REPLACE FUNCTION public.update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_company_wallet_timestamp ON public.company_wallet;
CREATE TRIGGER update_company_wallet_timestamp
BEFORE UPDATE ON public.company_wallet
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_timestamp();

-- Função para atualizar saldo quando pedido é entregue
CREATE OR REPLACE FUNCTION public.update_wallet_on_delivery()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se status mudou para ENTREGUE
  IF NEW.status = 'ENTREGUE' AND (OLD.status IS NULL OR OLD.status != 'ENTREGUE') THEN
    
    -- Inserir transação
    INSERT INTO public.wallet_transactions (
      tenant_id, 
      order_id, 
      amount, 
      type, 
      payment_method, 
      description
    )
    VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.total,
      'credit',
      NEW.payment_method::TEXT,
      'Entrega concluída - Pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8)
    );
    
    -- Criar ou atualizar saldo da carteira
    INSERT INTO public.company_wallet (tenant_id, balance)
    VALUES (NEW.tenant_id, NEW.total)
    ON CONFLICT (tenant_id) DO UPDATE
    SET 
      balance = public.company_wallet.balance + EXCLUDED.balance,
      updated_at = now();
      
    -- Notificar empresa sobre o crédito
    PERFORM public.create_notification(
      (SELECT p.id FROM public.profiles p 
       INNER JOIN public.user_roles ur ON ur.user_id = p.id
       WHERE p.tenant_id = NEW.tenant_id 
       AND ur.role = 'company_admin'
       LIMIT 1),
      NEW.tenant_id,
      'Novo Crédito Recebido',
      'Pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi entregue. +R$ ' || NEW.total::TEXT || ' adicionados à carteira.',
      'wallet',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para atualizar carteira
DROP TRIGGER IF EXISTS on_order_delivered_update_wallet ON public.orders;
CREATE TRIGGER on_order_delivered_update_wallet
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_wallet_on_delivery();

-- Habilitar RLS
ALTER TABLE public.company_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_wallet
DROP POLICY IF EXISTS "Company admins can view own wallet" ON public.company_wallet;
CREATE POLICY "Company admins can view own wallet"
ON public.company_wallet FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = company_wallet.tenant_id
  )
  AND public.has_role(auth.uid(), 'company_admin')
);

DROP POLICY IF EXISTS "System can manage wallets" ON public.company_wallet;
CREATE POLICY "System can manage wallets"
ON public.company_wallet FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Políticas RLS para wallet_transactions
DROP POLICY IF EXISTS "Company admins can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Company admins can view own transactions"
ON public.wallet_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = wallet_transactions.tenant_id
  )
  AND public.has_role(auth.uid(), 'company_admin')
);

DROP POLICY IF EXISTS "System can insert transactions" ON public.wallet_transactions;
CREATE POLICY "System can insert transactions"
ON public.wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (true);