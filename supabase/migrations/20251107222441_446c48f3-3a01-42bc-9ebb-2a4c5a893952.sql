-- Adicionar novos campos para configurações da empresa
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday":{"open":"08:00","close":"22:00","closed":false},"tuesday":{"open":"08:00","close":"22:00","closed":false},"wednesday":{"open":"08:00","close":"22:00","closed":false},"thursday":{"open":"08:00","close":"22:00","closed":false},"friday":{"open":"08:00","close":"22:00","closed":false},"saturday":{"open":"08:00","close":"22:00","closed":false},"sunday":{"open":"08:00","close":"22:00","closed":true}}'::JSONB,
ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{"cash":true,"card":true,"pix":false}'::JSONB,
ADD COLUMN IF NOT EXISTS delivery_settings JSONB DEFAULT '{"fee":5.00,"prep_time_minutes":30,"radius_km":10,"min_order_value":20.00}'::JSONB,
ADD COLUMN IF NOT EXISTS pix_key TEXT;