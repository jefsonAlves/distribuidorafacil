DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['SOLICITADO']) THEN
        ALTER TYPE public.order_status ADD VALUE 'SOLICITADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['PREPARANDO']) THEN
        ALTER TYPE public.order_status ADD VALUE 'PREPARANDO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['PRONTO']) THEN
        ALTER TYPE public.order_status ADD VALUE 'PRONTO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['COLETADO']) THEN
        ALTER TYPE public.order_status ADD VALUE 'COLETADO';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['CHEGOU']) THEN
        ALTER TYPE public.order_status ADD VALUE 'CHEGOU';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND enum_range(NULL::public.order_status) @> ARRAY['ENTREGUE']) THEN
        ALTER TYPE public.order_status ADD VALUE 'ENTREGUE';
    END IF;
END $$;
