-- Habilitar realtime para orders, corrigir pedidos órfãos e prevenir regressões
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END$$;

-- Corrigir pedidos órfãos que ficaram em EM_PREPARO sem motorista
UPDATE orders
SET
  status = 'ACEITO',
  preparing_at = NULL
WHERE
  status = 'EM_PREPARO'
  AND assigned_driver IS NULL;

-- Garantir que pedidos em preparo/rota tenham motorista atribuído
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS check_assigned_driver_for_em_preparo;

ALTER TABLE orders
  ADD CONSTRAINT check_assigned_driver_for_em_preparo
  CHECK (
    status NOT IN ('EM_PREPARO', 'A_CAMINHO', 'NA_PORTA')
    OR assigned_driver IS NOT NULL
  );

