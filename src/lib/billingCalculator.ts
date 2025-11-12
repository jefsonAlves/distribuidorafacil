import { supabase } from "@/integrations/supabase/client";

export interface BillingCharges {
  basePrice: number;
  extraDrivers: number;
  extraClients: number;
  extraProducts: number;
  customDesign: number;
  customDomain: number;
  whatsappIntegration: number;
  advancedAnalytics: number;
  loyaltyProgram: number;
  multiLocation: number;
  total: number;
}

export interface UsageDetails {
  drivers: number;
  clients: number;
  products: number;
  driversOverLimit: number;
  clientsOverLimit: number;
  productsOverLimit: number;
}

const FEATURE_PRICES: Record<string, number> = {
  customDesign: 50,
  customDomain: 30,
  whatsappIntegration: 40,
  advancedAnalytics: 60,
  loyaltyProgram: 35,
  multiLocation: 45,
};

export const calculateMonthlyBilling = async (
  tenantId: string
): Promise<{ charges: BillingCharges; usage: UsageDetails } | null> => {
  try {
    // Buscar features
    const { data: features, error: featuresError } = await supabase
      .from("tenant_features")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (featuresError) throw featuresError;

    // Buscar uso atual
    const [driversCount, clientsCount, productsCount] = await Promise.all([
      supabase
        .from("drivers")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
    ]);

    const usage: UsageDetails = {
      drivers: driversCount.count || 0,
      clients: clientsCount.count || 0,
      products: productsCount.count || 0,
      driversOverLimit: Math.max(0, (driversCount.count || 0) - features.max_drivers),
      clientsOverLimit: Math.max(0, (clientsCount.count || 0) - features.max_clients),
      productsOverLimit: Math.max(0, (productsCount.count || 0) - features.max_products),
    };

    const charges: BillingCharges = {
      basePrice: 0,
      extraDrivers: 0,
      extraClients: 0,
      extraProducts: 0,
      customDesign: 0,
      customDomain: 0,
      whatsappIntegration: 0,
      advancedAnalytics: 0,
      loyaltyProgram: 0,
      multiLocation: 0,
      total: 0,
    };

    // Motoristas extras
    if (usage.driversOverLimit > 0 && features.charges_for_extra_drivers) {
      charges.extraDrivers = usage.driversOverLimit * features.price_per_extra_driver;
    }

    // Clientes extras
    if (usage.clientsOverLimit > 0 && features.charges_for_extra_clients) {
      charges.extraClients = usage.clientsOverLimit * features.price_per_extra_client;
    }

    // Features adicionais
    if (features.can_customize_design && features.charges_for_design) {
      charges.customDesign = FEATURE_PRICES.customDesign;
    }

    if (features.can_use_custom_domain) {
      charges.customDomain = FEATURE_PRICES.customDomain;
    }

    if (features.can_use_whatsapp_integration) {
      charges.whatsappIntegration = FEATURE_PRICES.whatsappIntegration;
    }

    if (features.can_access_advanced_analytics) {
      charges.advancedAnalytics = FEATURE_PRICES.advancedAnalytics;
    }

    if (features.can_use_loyalty_program) {
      charges.loyaltyProgram = FEATURE_PRICES.loyaltyProgram;
    }

    if (features.can_use_multi_location) {
      charges.multiLocation = FEATURE_PRICES.multiLocation;
    }

    charges.total = Object.values(charges).reduce((sum, val) => sum + val, 0);

    return { charges, usage };
  } catch (error) {
    console.error("Erro ao calcular cobrança:", error);
    return null;
  }
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};
