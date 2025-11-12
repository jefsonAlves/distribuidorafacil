-- FASE 1: Atualizar defaults para valores mais restritivos
ALTER TABLE public.tenant_features 
  ALTER COLUMN max_drivers SET DEFAULT 1,
  ALTER COLUMN max_clients SET DEFAULT 10,
  ALTER COLUMN max_products SET DEFAULT 20,
  ALTER COLUMN max_orders_per_day SET DEFAULT 20,
  ALTER COLUMN can_customize_design SET DEFAULT false,
  ALTER COLUMN can_use_custom_domain SET DEFAULT false,
  ALTER COLUMN can_export_reports SET DEFAULT false,
  ALTER COLUMN can_use_whatsapp_integration SET DEFAULT false,
  ALTER COLUMN can_access_advanced_analytics SET DEFAULT false,
  ALTER COLUMN can_use_loyalty_program SET DEFAULT false,
  ALTER COLUMN can_use_multi_location SET DEFAULT false;

-- Criar função para auto-criar features ao criar empresa
CREATE OR REPLACE FUNCTION create_default_tenant_features()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tenant_features (tenant_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger para auto-criar features
DROP TRIGGER IF EXISTS auto_create_tenant_features ON public.tenants;
CREATE TRIGGER auto_create_tenant_features
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION create_default_tenant_features();

-- FASE 4: Trigger para log de mudanças de status de pedidos
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    INSERT INTO audit_logs (tenant_id, actor_id, action, resource, details)
    VALUES (
      NEW.tenant_id,
      auth.uid(),
      'UPDATE_ORDER_STATUS',
      'orders',
      jsonb_build_object(
        'order_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'assigned_driver', NEW.assigned_driver,
        'timestamp', now()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_order_status_changes ON public.orders;
CREATE TRIGGER audit_order_status_changes
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();