import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";
import { Mail } from "lucide-react";

interface FeatureLimitsCardProps {
  tenantId: string;
}

export const FeatureLimitsCard = ({ tenantId }: FeatureLimitsCardProps) => {
  const { features, loading, getCurrentUsage } = useTenantFeatures(tenantId);
  const [usage, setUsage] = useState({ drivers: 0, clients: 0, products: 0 });

  useEffect(() => {
    if (features) {
      fetchUsage();
    }
  }, [features]);

  const fetchUsage = async () => {
    const data = await getCurrentUsage();
    setUsage(data);
  };

  if (loading || !features) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Limites do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                <div className="h-2 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const calculatePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-warning";
    return "bg-primary";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limites do Plano</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Motoristas</span>
            <span className="font-medium">
              {usage.drivers} / {features.max_drivers}
            </span>
          </div>
          <Progress
            value={calculatePercentage(usage.drivers, features.max_drivers)}
            className="h-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Clientes</span>
            <span className="font-medium">
              {usage.clients} / {features.max_clients}
            </span>
          </div>
          <Progress
            value={calculatePercentage(usage.clients, features.max_clients)}
            className="h-2"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produtos</span>
            <span className="font-medium">
              {usage.products} / {features.max_products}
            </span>
          </div>
          <Progress
            value={calculatePercentage(usage.products, features.max_products)}
            className="h-2"
          />
        </div>

        {(calculatePercentage(usage.drivers, features.max_drivers) >= 80 ||
          calculatePercentage(usage.clients, features.max_clients) >= 80 ||
          calculatePercentage(usage.products, features.max_products) >= 80) && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-2">
              Você está próximo do limite do seu plano.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                window.location.href = "mailto:suporte@wathilibo.com?subject=Solicitar Upgrade de Plano";
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Solicitar Upgrade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
