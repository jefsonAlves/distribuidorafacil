import { useEffect, useState } from "react";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
}

interface FeatureGuardProps {
  tenantId: string;
  featureKey: keyof TenantFeatures;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAlert?: boolean;
}

export const FeatureGuard = ({ 
  tenantId, 
  featureKey, 
  children, 
  fallback,
  showAlert = true 
}: FeatureGuardProps) => {
  const { features, loading } = useTenantFeatures(tenantId);

  if (loading) {
    return <Skeleton className="h-20 w-full" />;
  }

  if (!features) {
    return null;
  }

  const isEnabled = features[featureKey];

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (!showAlert) {
      return null;
    }

    return (
      <Alert variant="destructive" className="my-4">
        <Lock className="h-4 w-4" />
        <AlertTitle>Funcionalidade Bloqueada</AlertTitle>
        <AlertDescription>
          Esta funcionalidade não está disponível no seu plano atual. 
          Entre em contato com o suporte para solicitar upgrade.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};
