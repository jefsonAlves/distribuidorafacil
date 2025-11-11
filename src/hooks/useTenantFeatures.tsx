import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TenantFeatures {
  id: string;
  tenant_id: string;
  max_drivers: number;
  max_clients: number;
  max_products: number;
  max_orders_per_day: number;
  can_customize_design: boolean;
  can_use_custom_domain: boolean;
  can_export_reports: boolean;
  can_use_whatsapp_integration: boolean;
  can_access_advanced_analytics: boolean;
  can_use_loyalty_program: boolean;
  can_use_multi_location: boolean;
  charges_for_design: boolean;
  charges_for_extra_drivers: boolean;
  charges_for_extra_clients: boolean;
  price_per_extra_driver: number;
  price_per_extra_client: number;
}

export const useTenantFeatures = (tenantId?: string) => {
  const [features, setFeatures] = useState<TenantFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchFeatures();
    }
  }, [tenantId]);

  const fetchFeatures = async () => {
    if (!tenantId) return;
    
    try {
      const { data, error } = await supabase
        .from("tenant_features")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (error) throw error;
      setFeatures(data);
    } catch (error) {
      console.error("Erro ao buscar features:", error);
    } finally {
      setLoading(false);
    }
  };

  const canCreateDriver = async () => {
    if (!features || !tenantId) return false;
    
    const { count } = await supabase
      .from("drivers")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    return (count || 0) < features.max_drivers;
  };

  const canCreateClient = async () => {
    if (!features || !tenantId) return false;
    
    const { count } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    return (count || 0) < features.max_clients;
  };

  const getCurrentUsage = async () => {
    if (!tenantId) return { drivers: 0, clients: 0, products: 0 };

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

    return {
      drivers: driversCount.count || 0,
      clients: clientsCount.count || 0,
      products: productsCount.count || 0,
    };
  };

  return {
    features,
    loading,
    canCreateDriver,
    canCreateClient,
    getCurrentUsage,
    refresh: fetchFeatures,
  };
};
