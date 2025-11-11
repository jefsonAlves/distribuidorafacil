import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface TenantFeaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

export const TenantFeaturesDialog = ({
  open,
  onOpenChange,
  tenantId,
  tenantName,
}: TenantFeaturesDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState<any>(null);
  const [currentUsage, setCurrentUsage] = useState({ drivers: 0, clients: 0, products: 0 });

  useEffect(() => {
    if (open && tenantId) {
      fetchFeatures();
      fetchCurrentUsage();
    }
  }, [open, tenantId]);

  const fetchFeatures = async () => {
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
      toast.error("Erro ao carregar configurações");
    }
  };

  const fetchCurrentUsage = async () => {
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

    setCurrentUsage({
      drivers: driversCount.count || 0,
      clients: clientsCount.count || 0,
      products: productsCount.count || 0,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("tenant_features")
        .update(features)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Registrar auditoria
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        await supabase.from("audit_logs").insert({
          tenant_id: tenantId,
          actor_id: session.session.user.id,
          action: "UPDATE_FEATURES",
          resource: "tenant_features",
          details: features,
        });
      }

      toast.success("Configurações atualizadas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar features:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  if (!features) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Features - {tenantName}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="limits" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="limits">Limites</TabsTrigger>
            <TabsTrigger value="features">Funcionalidades</TabsTrigger>
            <TabsTrigger value="billing">Cobrança</TabsTrigger>
          </TabsList>

          <TabsContent value="limits" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Máximo de Motoristas</Label>
                <Input
                  type="number"
                  min="0"
                  value={features.max_drivers}
                  onChange={(e) =>
                    setFeatures({ ...features, max_drivers: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Uso atual: {currentUsage.drivers} / {features.max_drivers}
                </p>
              </div>

              <div>
                <Label>Máximo de Clientes</Label>
                <Input
                  type="number"
                  min="0"
                  value={features.max_clients}
                  onChange={(e) =>
                    setFeatures({ ...features, max_clients: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Uso atual: {currentUsage.clients} / {features.max_clients}
                </p>
              </div>

              <div>
                <Label>Máximo de Produtos</Label>
                <Input
                  type="number"
                  min="0"
                  value={features.max_products}
                  onChange={(e) =>
                    setFeatures({ ...features, max_products: parseInt(e.target.value) })
                  }
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Uso atual: {currentUsage.products} / {features.max_products}
                </p>
              </div>

              <div>
                <Label>Máximo de Pedidos por Dia</Label>
                <Input
                  type="number"
                  min="0"
                  value={features.max_orders_per_day}
                  onChange={(e) =>
                    setFeatures({ ...features, max_orders_per_day: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="space-y-4">
              {[
                { key: "can_customize_design", label: "Personalização de Design" },
                { key: "can_use_custom_domain", label: "Domínio Personalizado" },
                { key: "can_export_reports", label: "Exportação de Relatórios" },
                { key: "can_use_whatsapp_integration", label: "Integração WhatsApp" },
                { key: "can_access_advanced_analytics", label: "Analytics Avançado" },
                { key: "can_use_loyalty_program", label: "Programa de Fidelidade" },
                { key: "can_use_multi_location", label: "Multi-localização" },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between">
                  <Label htmlFor={feature.key}>{feature.label}</Label>
                  <Switch
                    id={feature.key}
                    checked={features[feature.key]}
                    onCheckedChange={(checked) =>
                      setFeatures({ ...features, [feature.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="charges_for_design">Cobrar por Personalização</Label>
                <Switch
                  id="charges_for_design"
                  checked={features.charges_for_design}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, charges_for_design: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="charges_for_extra_drivers">Cobrar por Motoristas Extras</Label>
                <Switch
                  id="charges_for_extra_drivers"
                  checked={features.charges_for_extra_drivers}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, charges_for_extra_drivers: checked })
                  }
                />
              </div>

              {features.charges_for_extra_drivers && (
                <div>
                  <Label>Preço por Motorista Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={features.price_per_extra_driver}
                    onChange={(e) =>
                      setFeatures({
                        ...features,
                        price_per_extra_driver: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="charges_for_extra_clients">Cobrar por Clientes Extras</Label>
                <Switch
                  id="charges_for_extra_clients"
                  checked={features.charges_for_extra_clients}
                  onCheckedChange={(checked) =>
                    setFeatures({ ...features, charges_for_extra_clients: checked })
                  }
                />
              </div>

              {features.charges_for_extra_clients && (
                <div>
                  <Label>Preço por Cliente Extra (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={features.price_per_extra_client}
                    onChange={(e) =>
                      setFeatures({
                        ...features,
                        price_per_extra_client: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
