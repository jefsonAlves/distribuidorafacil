-- Add problem_category and problem_description to orders table
ALTER TABLE public.orders
ADD COLUMN problem_category TEXT,
ADD COLUMN problem_description TEXT;

-- Add a new type for problem categories to enforce valid values (optional, but good practice)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'problem_category_type') THEN
    CREATE TYPE public.problem_category_type AS ENUM (
      'CLIENTE_AUSENTE',
      'ENDERECO_INCORRETO',
      'PROBLEMA_PAGAMENTO',
      'PRODUTO_DANIFICADO',
      'VEICULO_PROBLEMA',
      'OUTROS'
    );
  END IF;
END
$$;

-- Alter column to use the new ENUM type
ALTER TABLE public.orders
ALTER COLUMN problem_category TYPE public.problem_category_type USING problem_category::public.problem_category_type;

-- Optionally, set a default value or make it NOT NULL if required
-- ALTER TABLE public.orders ALTER COLUMN problem_category SET DEFAULT 'OUTROS';
-- ALTER TABLE public.orders ALTER COLUMN problem_description SET NOT NULL; -- Only if you always expect a description

-- Add indexes for faster queries if you plan to search or filter by these columns
CREATE INDEX idx_orders_problem_category ON public.orders (problem_category);
