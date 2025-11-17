-- Tornar tenant_id opcional na tabela clients para permitir cadastros independentes
ALTER TABLE public.clients 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.clients.tenant_id IS 'Tenant ao qual o cliente está vinculado. Pode ser NULL para clientes que se cadastraram independentemente.';