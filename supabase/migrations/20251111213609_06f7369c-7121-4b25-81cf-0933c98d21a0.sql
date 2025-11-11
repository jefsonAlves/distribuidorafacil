-- Criar tabela tenant_features
CREATE TABLE IF NOT EXISTS public.tenant_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Limites Numéricos
  max_drivers INTEGER DEFAULT 1,
  max_clients INTEGER DEFAULT 50,
  max_products INTEGER DEFAULT 100,
  max_orders_per_day INTEGER DEFAULT 50,
  
  -- Features Booleanas (ativadas/desativadas)
  can_customize_design BOOLEAN DEFAULT false,
  can_use_custom_domain BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,
  can_use_whatsapp_integration BOOLEAN DEFAULT false,
  can_access_advanced_analytics BOOLEAN DEFAULT false,
  can_use_loyalty_program BOOLEAN DEFAULT false,
  can_use_multi_location BOOLEAN DEFAULT false,
  
  -- Cobrança por Features
  charges_for_design BOOLEAN DEFAULT false,
  charges_for_extra_drivers BOOLEAN DEFAULT false,
  charges_for_extra_clients BOOLEAN DEFAULT false,
  price_per_extra_driver NUMERIC(10,2) DEFAULT 10.00,
  price_per_extra_client NUMERIC(10,2) DEFAULT 1.00,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- RLS Policies
ALTER TABLE public.tenant_features ENABLE ROW LEVEL SECURITY;

-- Admin master pode gerenciar todas as features
CREATE POLICY "Admin master can manage all tenant features"
  ON public.tenant_features
  FOR ALL
  USING (has_role(auth.uid(), 'admin_master'::app_role));

-- Company admins podem VER suas próprias features (read-only)
CREATE POLICY "Company admins can view own features"
  ON public.tenant_features
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.tenant_id = tenant_features.tenant_id
    ) AND has_role(auth.uid(), 'company_admin'::app_role)
  );

-- Trigger para updated_at
CREATE TRIGGER update_tenant_features_updated_at
  BEFORE UPDATE ON public.tenant_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir features padrão para todas as empresas existentes
INSERT INTO public.tenant_features (tenant_id)
SELECT id FROM public.tenants
WHERE id NOT IN (SELECT tenant_id FROM public.tenant_features);