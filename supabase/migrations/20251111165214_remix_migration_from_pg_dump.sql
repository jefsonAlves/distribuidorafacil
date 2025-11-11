--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin_master',
    'company_admin',
    'driver',
    'client'
);


--
-- Name: driver_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.driver_status AS ENUM (
    'INACTIVE',
    'ACTIVE',
    'ONLINE',
    'IN_SERVICE'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'PENDENTE',
    'ACEITO',
    'EM_PREPARO',
    'A_CAMINHO',
    'NA_PORTA',
    'ENTREGUE',
    'CANCELADO'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'PIX',
    'CARD',
    'CASH'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'FAILED'
);


--
-- Name: product_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.product_type AS ENUM (
    'product',
    'service'
);


--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_status AS ENUM (
    'ACTIVE',
    'SUSPENDED'
);


--
-- Name: vehicle_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_type AS ENUM (
    'MOTO',
    'CARRO',
    'BICICLETA',
    'A_PE'
);


--
-- Name: create_admin_master(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_admin_master(p_email text, p_full_name text DEFAULT 'Admin Master'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Buscar user_id baseado no email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado. Faça o cadastro primeiro.', p_email;
  END IF;
  
  -- Inserir/atualizar profile
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (admin_user_id, p_email, p_full_name, 'admin_master')
  ON CONFLICT (id) DO UPDATE
  SET user_type = 'admin_master',
      full_name = EXCLUDED.full_name;
  
  -- Inserir role admin_master
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin_master'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN admin_user_id;
END;
$$;


--
-- Name: create_notification(uuid, uuid, text, text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_tenant_id uuid, p_title text, p_message text, p_type text, p_reference_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, tenant_id, title, message, type, reference_id)
  VALUES (p_user_id, p_tenant_id, p_title, p_message, p_type, p_reference_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- Inserir perfil base
  INSERT INTO public.profiles (id, email, full_name, user_type, phone, cpf, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  CASE NEW.raw_user_meta_data->>'user_type'
    
    WHEN 'company' THEN
      INSERT INTO public.tenants (name, cnpj, email, phone, status)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'Nova Empresa'),
        COALESCE(NEW.raw_user_meta_data->>'cnpj', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        'ACTIVE'
      )
      RETURNING id INTO new_tenant_id;
      
      UPDATE public.profiles 
      SET tenant_id = new_tenant_id 
      WHERE id = NEW.id;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'company_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    WHEN 'driver' THEN
      -- Apenas cria role driver, registro em drivers será criado via Edge Function
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'driver'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    ELSE
      INSERT INTO public.clients (user_id, full_name, email, phone, cpf)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', '')
      )
      ON CONFLICT DO NOTHING;
      
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'client'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END CASE;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: notify_driver_assigned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_driver_assigned() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  driver_user_id UUID;
BEGIN
  -- Verificar se motorista foi atribuído
  IF NEW.assigned_driver IS NOT NULL AND (OLD.assigned_driver IS NULL OR OLD.assigned_driver != NEW.assigned_driver) THEN
    -- Buscar user_id do motorista
    SELECT user_id INTO driver_user_id
    FROM public.drivers
    WHERE id = NEW.assigned_driver;

    IF driver_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        driver_user_id,
        NEW.tenant_id,
        'Nova Entrega Atribuída',
        'Você foi atribuído ao pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || '. Verifique os detalhes.',
        'order',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_order_created(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_created() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  company_admin_id UUID;
BEGIN
  -- Buscar admin da empresa
  SELECT p.id INTO company_admin_id
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.tenant_id = NEW.tenant_id 
    AND ur.role = 'company_admin'
  LIMIT 1;

  IF company_admin_id IS NOT NULL THEN
    PERFORM public.create_notification(
      company_admin_id,
      NEW.tenant_id,
      'Novo Pedido Recebido',
      'Um novo pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi criado e aguarda processamento.',
      'order',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: notify_order_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_order_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  client_user_id UUID;
  status_message TEXT;
  status_title TEXT;
BEGIN
  -- Buscar user_id do cliente
  SELECT user_id INTO client_user_id
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Verificar mudança de status
  IF NEW.status != OLD.status THEN
    CASE NEW.status
      WHEN 'ACEITO' THEN
        status_title := 'Pedido Aceito';
        status_message := 'Seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi aceito e está sendo preparado.';
      WHEN 'EM_PREPARO' THEN
        status_title := 'Pedido em Preparo';
        status_message := 'Seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' está sendo preparado.';
      WHEN 'A_CAMINHO' THEN
        status_title := 'Pedido a Caminho';
        status_message := 'Seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' está a caminho!';
      WHEN 'NA_PORTA' THEN
        status_title := 'Entregador Chegou';
        status_message := 'O entregador chegou com seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || '!';
      WHEN 'ENTREGUE' THEN
        status_title := 'Pedido Entregue';
        status_message := 'Seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi entregue com sucesso!';
      WHEN 'CANCELADO' THEN
        status_title := 'Pedido Cancelado';
        status_message := 'Seu pedido #' || SUBSTRING(NEW.id::TEXT, 1, 8) || ' foi cancelado.';
      ELSE
        RETURN NEW;
    END CASE;

    IF client_user_id IS NOT NULL THEN
      PERFORM public.create_notification(
        client_user_id,
        NEW.tenant_id,
        status_title,
        status_message,
        'order',
        NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_wallet_on_delivery(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_on_delivery() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
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
$_$;


--
-- Name: update_wallet_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_wallet_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    tenant_id uuid,
    actor_id uuid,
    action text NOT NULL,
    resource text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: billing_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    billing_type text NOT NULL,
    value numeric NOT NULL,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT billing_configs_billing_type_check CHECK ((billing_type = ANY (ARRAY['percentage'::text, 'monthly'::text])))
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    full_name text,
    cpf text,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    address jsonb
);


--
-- Name: company_wallet; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_wallet (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    balance numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT balance_positive CHECK ((balance >= (0)::numeric))
);


--
-- Name: driver_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.driver_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    driver_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid,
    user_id uuid,
    name text NOT NULL,
    cpf text,
    phone text,
    vehicle public.vehicle_type,
    plate text,
    photo_url text,
    status public.driver_status DEFAULT 'INACTIVE'::public.driver_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tenant_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    name text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    client_id uuid NOT NULL,
    total numeric(12,2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    change_for numeric(12,2),
    address jsonb NOT NULL,
    status public.order_status DEFAULT 'PENDENTE'::public.order_status NOT NULL,
    assigned_driver uuid,
    cancel_reason text,
    eta_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    preparing_at timestamp with time zone,
    on_way_at timestamp with time zone,
    at_door_at timestamp with time zone,
    delivered_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric,
    longitude numeric
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    category text,
    type public.product_type DEFAULT 'product'::public.product_type NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    prepare_time_minutes integer DEFAULT 15 NOT NULL,
    images text[],
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    phone text,
    cpf text,
    tenant_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    user_type text
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    cnpj text,
    email text,
    phone text,
    domain text,
    primary_color text DEFAULT '#3b82f6'::text,
    secondary_color text DEFAULT '#f59e0b'::text,
    logo_url text,
    banner_urls text[],
    status public.tenant_status DEFAULT 'ACTIVE'::public.tenant_status NOT NULL,
    plan text DEFAULT 'basic'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    business_hours jsonb DEFAULT '{"friday": {"open": "08:00", "close": "22:00", "closed": false}, "monday": {"open": "08:00", "close": "22:00", "closed": false}, "sunday": {"open": "08:00", "close": "22:00", "closed": true}, "tuesday": {"open": "08:00", "close": "22:00", "closed": false}, "saturday": {"open": "08:00", "close": "22:00", "closed": false}, "thursday": {"open": "08:00", "close": "22:00", "closed": false}, "wednesday": {"open": "08:00", "close": "22:00", "closed": false}}'::jsonb,
    payment_methods jsonb DEFAULT '{"pix": false, "card": true, "cash": true}'::jsonb,
    delivery_settings jsonb DEFAULT '{"fee": 5.00, "radius_km": 10, "min_order_value": 20.00, "prep_time_minutes": 30}'::jsonb,
    pix_key text,
    slug text
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_id uuid,
    amount numeric(10,2) NOT NULL,
    type text NOT NULL,
    payment_method text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_transactions_type_check CHECK ((type = ANY (ARRAY['credit'::text, 'debit'::text])))
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: billing_configs billing_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_configs
    ADD CONSTRAINT billing_configs_pkey PRIMARY KEY (id);


--
-- Name: billing_configs billing_configs_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_configs
    ADD CONSTRAINT billing_configs_tenant_id_key UNIQUE (tenant_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: company_wallet company_wallet_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_wallet
    ADD CONSTRAINT company_wallet_pkey PRIMARY KEY (id);


--
-- Name: company_wallet company_wallet_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_wallet
    ADD CONSTRAINT company_wallet_tenant_id_key UNIQUE (tenant_id);


--
-- Name: driver_sessions driver_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT driver_sessions_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_domain_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_domain_key UNIQUE (domain);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_key UNIQUE (slug);


--
-- Name: tenants tenants_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_slug_unique UNIQUE (slug);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: drivers_user_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX drivers_user_id_unique ON public.drivers USING btree (user_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs USING btree (tenant_id);


--
-- Name: idx_clients_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clients_tenant_id ON public.clients USING btree (tenant_id);


--
-- Name: idx_driver_sessions_driver_dates; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_sessions_driver_dates ON public.driver_sessions USING btree (driver_id, started_at, ended_at);


--
-- Name: idx_driver_sessions_driver_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_sessions_driver_id ON public.driver_sessions USING btree (driver_id);


--
-- Name: idx_driver_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_sessions_started_at ON public.driver_sessions USING btree (started_at);


--
-- Name: idx_driver_sessions_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_driver_sessions_tenant_id ON public.driver_sessions USING btree (tenant_id);


--
-- Name: idx_drivers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_status ON public.drivers USING btree (status);


--
-- Name: idx_drivers_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_drivers_tenant_id ON public.drivers USING btree (tenant_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_orders_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_client_id ON public.orders USING btree (client_id);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_driver_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_driver_status ON public.orders USING btree (assigned_driver, status);


--
-- Name: idx_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_status ON public.orders USING btree (status);


--
-- Name: idx_orders_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tenant_id ON public.orders USING btree (tenant_id);


--
-- Name: idx_orders_tenant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_tenant_status ON public.orders USING btree (tenant_id, status);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_active ON public.products USING btree (active);


--
-- Name: idx_products_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tenant_id ON public.products USING btree (tenant_id);


--
-- Name: idx_tenants_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenants_slug ON public.tenants USING btree (slug);


--
-- Name: idx_wallet_transactions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_created ON public.wallet_transactions USING btree (created_at DESC);


--
-- Name: idx_wallet_transactions_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_order ON public.wallet_transactions USING btree (order_id);


--
-- Name: idx_wallet_transactions_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_tenant ON public.wallet_transactions USING btree (tenant_id);


--
-- Name: orders on_order_delivered_update_wallet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_order_delivered_update_wallet AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_wallet_on_delivery();


--
-- Name: orders trigger_notify_driver_assigned; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_driver_assigned AFTER UPDATE ON public.orders FOR EACH ROW WHEN ((old.assigned_driver IS DISTINCT FROM new.assigned_driver)) EXECUTE FUNCTION public.notify_driver_assigned();


--
-- Name: orders trigger_notify_order_created; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_order_created AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_order_created();


--
-- Name: orders trigger_notify_order_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_notify_order_status_change AFTER UPDATE ON public.orders FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.notify_order_status_change();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_wallet update_company_wallet_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_wallet_timestamp BEFORE UPDATE ON public.company_wallet FOR EACH ROW EXECUTE FUNCTION public.update_wallet_timestamp();


--
-- Name: drivers update_drivers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders update_orders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: billing_configs billing_configs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_configs
    ADD CONSTRAINT billing_configs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: clients clients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: clients clients_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_wallet company_wallet_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_wallet
    ADD CONSTRAINT company_wallet_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: driver_sessions driver_sessions_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT driver_sessions_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE CASCADE;


--
-- Name: driver_sessions driver_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT driver_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: drivers drivers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: drivers drivers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_assigned_driver_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_assigned_driver_fkey FOREIGN KEY (assigned_driver) REFERENCES public.drivers(id);


--
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id);


--
-- Name: orders orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: wallet_transactions wallet_transactions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: user_roles Admin master can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin master can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));


--
-- Name: tenants Admin master can manage all tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin master can manage all tenants" ON public.tenants TO authenticated USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));


--
-- Name: billing_configs Admin master can manage billing configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin master can manage billing configs" ON public.billing_configs USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));


--
-- Name: audit_logs Admin master can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin master can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));


--
-- Name: profiles Admin master can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin master can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin_master'::public.app_role));


--
-- Name: orders Clients can create orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = orders.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: order_items Clients can insert items for own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can insert items for own orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (EXISTS ( SELECT 1
           FROM public.clients
          WHERE ((clients.id = orders.client_id) AND (clients.user_id = auth.uid()))))))));


--
-- Name: clients Clients can manage own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can manage own profile" ON public.clients TO authenticated USING ((auth.uid() = user_id));


--
-- Name: orders Clients can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view own orders" ON public.orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = orders.client_id) AND (clients.user_id = auth.uid())))));


--
-- Name: products Clients can view products of their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view products of their tenant" ON public.products FOR SELECT TO authenticated USING (((active = true) AND (EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.tenant_id = products.tenant_id) AND (clients.user_id = auth.uid()))))));


--
-- Name: tenants Clients can view their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their tenant" ON public.tenants FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.tenant_id = tenants.id) AND (clients.user_id = auth.uid())))));


--
-- Name: order_items Company admins can delete tenant order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can delete tenant order items" ON public.order_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = orders.tenant_id) AND public.has_role(auth.uid(), 'company_admin'::public.app_role))))))));


--
-- Name: drivers Company admins can insert drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = drivers.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: order_items Company admins can insert items for tenant orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can insert items for tenant orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = orders.tenant_id) AND public.has_role(auth.uid(), 'company_admin'::public.app_role))))))));


--
-- Name: drivers Company admins can manage drivers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can manage drivers" ON public.drivers TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = drivers.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: products Company admins can manage own products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can manage own products" ON public.products TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = products.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: orders Company admins can manage tenant orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can manage tenant orders" ON public.orders TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = orders.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: order_items Company admins can update tenant order items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can update tenant order items" ON public.order_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = orders.tenant_id) AND public.has_role(auth.uid(), 'company_admin'::public.app_role))))))));


--
-- Name: billing_configs Company admins can view own billing config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view own billing config" ON public.billing_configs FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = billing_configs.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: tenants Company admins can view own tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view own tenant" ON public.tenants FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = tenants.id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: wallet_transactions Company admins can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view own transactions" ON public.wallet_transactions FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = wallet_transactions.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: company_wallet Company admins can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view own wallet" ON public.company_wallet FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = company_wallet.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: audit_logs Company admins can view tenant audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view tenant audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = audit_logs.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: clients Company admins can view tenant clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view tenant clients" ON public.clients FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = clients.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: driver_sessions Company admins can view tenant driver sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company admins can view tenant driver sessions" ON public.driver_sessions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = driver_sessions.tenant_id)))) AND public.has_role(auth.uid(), 'company_admin'::public.app_role)));


--
-- Name: driver_sessions Drivers can insert own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can insert own sessions" ON public.driver_sessions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_sessions.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: orders Drivers can update assigned orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update assigned orders" ON public.orders FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = orders.assigned_driver) AND (drivers.user_id = auth.uid())))));


--
-- Name: drivers Drivers can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update own profile" ON public.drivers FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: driver_sessions Drivers can update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can update own sessions" ON public.driver_sessions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_sessions.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: orders Drivers can view assigned orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view assigned orders" ON public.orders FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = orders.assigned_driver) AND (drivers.user_id = auth.uid())))));


--
-- Name: drivers Drivers can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view own profile" ON public.drivers FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: driver_sessions Drivers can view own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Drivers can view own sessions" ON public.driver_sessions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.drivers
  WHERE ((drivers.id = driver_sessions.driver_id) AND (drivers.user_id = auth.uid())))));


--
-- Name: audit_logs Only service_role can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only service_role can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (false);


--
-- Name: notifications Service role can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: wallet_transactions System can insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert transactions" ON public.wallet_transactions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: company_wallet System can manage wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage wallets" ON public.company_wallet TO authenticated USING (true) WITH CHECK (true);


--
-- Name: user_roles Users can insert own client role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own client role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'client'::public.app_role)));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: order_items Users can view order items of accessible orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view order items of accessible orders" ON public.order_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE ((orders.id = order_items.order_id) AND ((EXISTS ( SELECT 1
           FROM public.clients
          WHERE ((clients.id = orders.client_id) AND (clients.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.tenant_id = orders.tenant_id) AND (public.has_role(auth.uid(), 'company_admin'::public.app_role) OR public.has_role(auth.uid(), 'driver'::public.app_role))))))))));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: company_wallet; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_wallet ENABLE ROW LEVEL SECURITY;

--
-- Name: driver_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: drivers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


