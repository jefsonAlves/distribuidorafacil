
-- Migration: 20251105112036

-- Migration: 20251031140718

-- Migration: 20251030134610
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('admin_master', 'company_admin', 'driver', 'client');
CREATE TYPE order_status AS ENUM ('PENDENTE', 'ACEITO', 'EM_PREPARO', 'A_CAMINHO', 'NA_PORTA', 'ENTREGUE', 'CANCELADO');
CREATE TYPE payment_method AS ENUM ('PIX', 'CARD', 'CASH');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE driver_status AS ENUM ('INACTIVE', 'ACTIVE', 'ONLINE', 'IN_SERVICE');
CREATE TYPE product_type AS ENUM ('product', 'service');
CREATE TYPE vehicle_type AS ENUM ('MOTO', 'CARRO', 'BICICLETA', 'A_PE');

-- Profiles table (extends Supabase Auth users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  cpf TEXT,
  role app_role NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tenants (empresas/instâncias)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  domain TEXT UNIQUE,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#f59e0b',
  logo_url TEXT,
  banner_urls TEXT[],
  status tenant_status DEFAULT 'ACTIVE' NOT NULL,
  plan TEXT DEFAULT 'basic',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  type product_type DEFAULT 'product' NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  prepare_time_minutes INTEGER DEFAULT 15 NOT NULL,
  images TEXT[],
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Drivers
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf TEXT,
  phone TEXT,
  vehicle vehicle_type,
  plate TEXT,
  photo_url TEXT,
  status driver_status DEFAULT 'INACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  cpf TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_status payment_status DEFAULT 'PENDING' NOT NULL,
  change_for NUMERIC(12,2),
  address JSONB NOT NULL,
  status order_status DEFAULT 'PENDENTE' NOT NULL,
  assigned_driver UUID REFERENCES drivers(id),
  cancel_reason TEXT,
  eta_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  accepted_at TIMESTAMPTZ,
  preparing_at TIMESTAMPTZ,
  on_way_at TIMESTAMPTZ,
  at_door_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Order Items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit Logs (somente INSERT por service_role)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin master can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_master')
);

-- RLS Policies for Tenants
CREATE POLICY "Admin master can manage all tenants" ON tenants FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Company admins can view own tenant" ON tenants FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = tenants.id AND role = 'company_admin')
);

-- RLS Policies for Products
CREATE POLICY "Company admins can manage own products" ON products FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = products.tenant_id AND role = 'company_admin')
);
CREATE POLICY "Clients can view active products" ON products FOR SELECT USING (
  active = true AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = products.tenant_id)
);

-- RLS Policies for Drivers
CREATE POLICY "Company admins can manage drivers" ON drivers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = drivers.tenant_id AND role = 'company_admin')
);
CREATE POLICY "Drivers can view own profile" ON drivers FOR SELECT USING (
  auth.uid() = user_id
);

-- RLS Policies for Clients
CREATE POLICY "Clients can manage own profile" ON clients FOR ALL USING (
  auth.uid() = user_id
);
CREATE POLICY "Company admins can view tenant clients" ON clients FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = clients.tenant_id AND role = 'company_admin')
);

-- RLS Policies for Orders
CREATE POLICY "Clients can view own orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM clients WHERE id = orders.client_id AND user_id = auth.uid())
);
CREATE POLICY "Clients can create orders" ON orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM clients WHERE id = orders.client_id AND user_id = auth.uid())
);
CREATE POLICY "Company admins can manage tenant orders" ON orders FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = orders.tenant_id AND role = 'company_admin')
);
CREATE POLICY "Drivers can view assigned orders" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM drivers WHERE id = orders.assigned_driver AND user_id = auth.uid())
);
CREATE POLICY "Drivers can update assigned orders" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM drivers WHERE id = orders.assigned_driver AND user_id = auth.uid())
);

-- RLS Policies for Order Items
CREATE POLICY "Users can view order items of accessible orders" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders WHERE id = order_items.order_id AND (
      EXISTS (SELECT 1 FROM clients WHERE id = orders.client_id AND user_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = orders.tenant_id AND role IN ('company_admin', 'driver'))
    )
  )
);

-- RLS Policies for Audit Logs (somente service_role pode inserir)
CREATE POLICY "Only service_role can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (false);
CREATE POLICY "Admin master can view all audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin_master')
);
CREATE POLICY "Company admins can view tenant audit logs" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tenant_id = audit_logs.tenant_id AND role = 'company_admin')
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed data: Admin Master (Jeffson)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'jefson.ti@gmail.com',
  crypt('81864895', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Jeffson Admin Master"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name, phone, cpf, role, tenant_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'jefson.ti@gmail.com',
  'Jeffson Admin Master',
  '(62) 98209-4069',
  '009.958.453-01',
  'admin_master',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_client_id ON orders(client_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_drivers_tenant_id ON drivers(tenant_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);


-- Migration: 20251031141527
-- Force types regeneration by adding a comment
COMMENT ON TABLE tenants IS 'Multi-tenant companies table';

-- Migration: 20251101222119
-- =====================================================
-- FASE 1: CORREÇÃO DE SEGURANÇA - SEPARAR ROLES
-- Ordem correta: criar nova estrutura, dropar policies antigas, remover coluna, criar novas policies
-- =====================================================

-- 1. Criar tabela user_roles (roles NÃO podem estar na tabela profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- 2. Habilitar RLS na user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar função SECURITY DEFINER para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Migrar roles existentes da profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- =====================================================
-- DROPAR TODAS AS POLICIES QUE DEPENDEM DE role
-- =====================================================

-- PROFILES
DROP POLICY IF EXISTS "Admin master can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- TENANTS
DROP POLICY IF EXISTS "Admin master can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Company admins can view own tenant" ON public.tenants;

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Admin master can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Company admins can view tenant audit logs" ON public.audit_logs;

-- DRIVERS
DROP POLICY IF EXISTS "Company admins can manage drivers" ON public.drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON public.drivers;

-- CLIENTS
DROP POLICY IF EXISTS "Company admins can view tenant clients" ON public.clients;
DROP POLICY IF EXISTS "Clients can manage own profile" ON public.clients;

-- PRODUCTS
DROP POLICY IF EXISTS "Company admins can manage own products" ON public.products;
DROP POLICY IF EXISTS "Clients can view active products" ON public.products;

-- ORDERS
DROP POLICY IF EXISTS "Company admins can manage tenant orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Drivers can update assigned orders" ON public.orders;

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Users can view order items of accessible orders" ON public.order_items;

-- 5. Remover coluna role da profiles (agora pode remover com segurança)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- 6. Adicionar coluna user_type para identificar tipo de cadastro
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT;

-- =====================================================
-- CRIAR NOVAS POLICIES USANDO has_role()
-- =====================================================

-- PROFILES
CREATE POLICY "Admin master can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- TENANTS
CREATE POLICY "Admin master can manage all tenants"
ON public.tenants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Company admins can view own tenant"
ON public.tenants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = tenants.id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

-- AUDIT_LOGS
CREATE POLICY "Admin master can view all audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Company admins can view tenant audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = audit_logs.tenant_id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

-- DRIVERS
CREATE POLICY "Company admins can manage drivers"
ON public.drivers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = drivers.tenant_id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Drivers can view own profile"
ON public.drivers FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- CLIENTS
CREATE POLICY "Company admins can view tenant clients"
ON public.clients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = clients.tenant_id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Clients can manage own profile"
ON public.clients FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- PRODUCTS
CREATE POLICY "Company admins can manage own products"
ON public.products FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = products.tenant_id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Clients can view active products"
ON public.products FOR SELECT
TO authenticated
USING (
  active = true AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = products.tenant_id
  )
);

-- ORDERS
CREATE POLICY "Company admins can manage tenant orders"
ON public.orders FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = orders.tenant_id
  ) AND public.has_role(auth.uid(), 'company_admin')
);

CREATE POLICY "Clients can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = orders.client_id
      AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Clients can view own orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = orders.client_id
      AND clients.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can view assigned orders"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE drivers.id = orders.assigned_driver
      AND drivers.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can update assigned orders"
ON public.orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.drivers
    WHERE drivers.id = orders.assigned_driver
      AND drivers.user_id = auth.uid()
  )
);

-- ORDER_ITEMS
CREATE POLICY "Users can view order items of accessible orders"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND (
        EXISTS (
          SELECT 1 FROM public.clients
          WHERE clients.id = orders.client_id
            AND clients.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.tenant_id = orders.tenant_id
            AND (
              public.has_role(auth.uid(), 'company_admin')
              OR public.has_role(auth.uid(), 'driver')
            )
        )
      )
  )
);

-- USER_ROLES
CREATE POLICY "Admin master can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGER PARA AUTO-CRIAR PROFILE E ROLE AO REGISTRAR
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')
  );
  
  -- Inserir role baseado no user_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'company' THEN 'company_admin'::app_role
      WHEN NEW.raw_user_meta_data->>'user_type' = 'driver' THEN 'driver'::app_role
      ELSE 'client'::app_role
    END
  );
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Migration: 20251101222313
-- =====================================================
-- FASE 1: CONFIGURAÇÃO FINAL DE SEGURANÇA
-- =====================================================

-- 1. Garantir que user_roles existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Garantir que has_role existe
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Adicionar user_type se não existir
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'client';

-- 4. Criar/Atualizar trigger para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Inserir role baseado no user_type
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE 
      WHEN NEW.raw_user_meta_data->>'user_type' = 'company' THEN 'company_admin'::app_role
      WHEN NEW.raw_user_meta_data->>'user_type' = 'driver' THEN 'driver'::app_role
      ELSE 'client'::app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Policies para user_roles
DROP POLICY IF EXISTS "Admin master can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admin master can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Migration: 20251103110133
-- Criar tabela para rastrear sessões de disponibilidade dos motoristas
CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX idx_driver_sessions_driver_id ON public.driver_sessions(driver_id);
CREATE INDEX idx_driver_sessions_tenant_id ON public.driver_sessions(tenant_id);
CREATE INDEX idx_driver_sessions_started_at ON public.driver_sessions(started_at);

-- Habilitar RLS
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Company admins can view tenant driver sessions"
  ON public.driver_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = driver_sessions.tenant_id
    )
    AND has_role(auth.uid(), 'company_admin'::app_role)
  );

CREATE POLICY "Drivers can view own sessions"
  ON public.driver_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = driver_sessions.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can insert own sessions"
  ON public.driver_sessions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = driver_sessions.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update own sessions"
  ON public.driver_sessions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.id = driver_sessions.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Adicionar coluna de endereço no perfil do cliente se não existir
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address JSONB;

-- Função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at em driver_sessions (não precisa pois não tem updated_at);

-- Migration: 20251103110257
-- Corrigir função update_updated_at_column para ter search_path seguro
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Migration: 20251104145840
-- FASE 7 & 9: Adicionar billing_configs e coordenadas para roteamento

-- 1. Criar tabela de configurações de cobrança
CREATE TABLE public.billing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('percentage', 'monthly')),
  value NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- 2. Adicionar coordenadas aos pedidos (FASE 9 - roteamento)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON public.orders(assigned_driver, status);
CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_dates ON public.driver_sessions(driver_id, started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON public.orders(client_id);

-- 4. RLS para billing_configs
ALTER TABLE public.billing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin master can manage billing configs"
ON public.billing_configs FOR ALL
USING (has_role(auth.uid(), 'admin_master'::app_role));

CREATE POLICY "Company admins can view own billing config"
ON public.billing_configs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.tenant_id = billing_configs.tenant_id
  )
  AND has_role(auth.uid(), 'company_admin'::app_role)
);

-- Migration: 20251105105957
-- FASE 2 & 3: Ajustar estrutura e atualizar trigger

-- Tornar tenant_id nullable em clients (multi-tenant)
ALTER TABLE public.clients ALTER COLUMN tenant_id DROP NOT NULL;

-- Tornar tenant_id nullable em drivers
ALTER TABLE public.drivers ALTER COLUMN tenant_id DROP NOT NULL;

-- Atualizar trigger para criar registros nas tabelas corretas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    NULL -- Multi-tenant: clientes não têm tenant_id fixo
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Processar baseado no tipo de usuário
  CASE NEW.raw_user_meta_data->>'user_type'
    
    -- COMPANY: criar tenant e associar
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
      
      -- Atualizar profile com tenant_id
      UPDATE public.profiles 
      SET tenant_id = new_tenant_id 
      WHERE id = NEW.id;
      
      -- Inserir role company_admin
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'company_admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    -- DRIVER: criar registro de driver
    WHEN 'driver' THEN
      INSERT INTO public.drivers (user_id, name, cpf, phone, vehicle, status)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'vehicle', '')::vehicle_type,
        'INACTIVE'::driver_status
      );
      
      -- Inserir role driver
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'driver'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    
    -- CLIENT: criar registro de cliente
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
      
      -- Inserir role client
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'client'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
  END CASE;
  
  RETURN NEW;
END;
$$;

-- FASE 4: Migration corretiva - criar registros de clients faltantes
INSERT INTO public.clients (user_id, full_name, email, phone, cpf)
SELECT 
  ur.user_id,
  COALESCE(p.full_name, ''),
  p.email,
  COALESCE(p.phone, ''),
  COALESCE(p.cpf, '')
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN public.clients c ON c.user_id = ur.user_id
WHERE ur.role = 'client'::app_role
  AND c.id IS NULL
ON CONFLICT DO NOTHING;


-- Migration: 20251105112833
-- FASE 3: Sistema de Notificações Completo

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order', 'driver', 'system'
  reference_id UUID, -- ID do pedido/motorista relacionado
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Permitir service_role inserir notificações
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS
-- ============================================

-- Função para criar notificação
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_tenant_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_reference_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger: Notificar empresa quando pedido é criado
CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER trigger_notify_order_created
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_created();

-- Trigger: Notificar cliente quando pedido é aceito/status muda
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER trigger_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_order_status_change();

-- Trigger: Notificar motorista quando pedido é atribuído
CREATE OR REPLACE FUNCTION public.notify_driver_assigned()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE TRIGGER trigger_notify_driver_assigned
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (OLD.assigned_driver IS DISTINCT FROM NEW.assigned_driver)
EXECUTE FUNCTION public.notify_driver_assigned();
