-- Add ENTREGA_PENDENTE status to order_status enum
-- Note: PostgreSQL doesn't support IF NOT EXISTS for ALTER TYPE ADD VALUE
-- This migration will fail if the value already exists, which is expected behavior
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ENTREGA_PENDENTE' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status')
  ) THEN
    ALTER TYPE order_status ADD VALUE 'ENTREGA_PENDENTE';
  END IF;
END $$;

