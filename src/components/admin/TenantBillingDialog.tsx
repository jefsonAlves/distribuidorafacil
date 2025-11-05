// FASE 7: Dialog para configurar cobrança de empresas
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TenantBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  onSuccess: () => void;
}

export const TenantBillingDialog = ({ open, onOpenChange, tenant, onSuccess }: TenantBillingDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [billingType, setBillingType] = useState<string>("percentage");
  const [value, setValue] = useState<string>("");
  const [existingConfig, setExistingConfig] = useState<any>(null);

  useEffect(() => {
    if (open && tenant) {
      fetchBillingConfig();
    }
  }, [open, tenant]);

  const fetchBillingConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("billing_configs")
        .select("*")
        .eq("tenant_id", tenant.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setExistingConfig(data);
        setBillingType(data.billing_type);
        setValue(data.value.toString());
      } else {
        setExistingConfig(null);
        setBillingType("percentage");
        setValue("");
      }
    } catch (error: any) {
      console.error("Erro ao buscar configuração:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value || parseFloat(value) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    setLoading(true);
    try {
      const billingData = {
        tenant_id: tenant.id,
        billing_type: billingType,
        value: parseFloat(value),
        active: true,
      };

      if (existingConfig) {
        const { error } = await supabase
          .from("billing_configs")
          .update(billingData)
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("billing_configs")
          .insert([billingData]);

        if (error) throw error;
      }

      toast.success("Configuração de cobrança salva!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao salvar configuração:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurar Cobrança - {tenant?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Cobrança</Label>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Taxa por Venda (%)</SelectItem>
                <SelectItem value="monthly">Mensalidade Fixa (R$)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              {billingType === "percentage" 
                ? "Percentual (%)" 
                : "Valor Mensal (R$)"}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={billingType === "percentage" ? "Ex: 5.5" : "Ex: 199.90"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
            {billingType === "percentage" && (
              <p className="text-xs text-muted-foreground mt-1">
                Será aplicado sobre cada venda realizada pela empresa
              </p>
            )}
            {billingType === "monthly" && (
              <p className="text-xs text-muted-foreground mt-1">
                Valor fixo cobrado mensalmente da empresa
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
