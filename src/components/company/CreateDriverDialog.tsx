import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTenantFeatures } from "@/hooks/useTenantFeatures";

interface CreateDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSuccess: () => void;
}

export const CreateDriverDialog = ({ open, onOpenChange, tenantId, onSuccess }: CreateDriverDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { canCreateDriver } = useTenantFeatures(tenantId);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    cpf: "",
    vehicle: "",
    plate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);

    try {
      // Validar limite de motoristas no servidor
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-tenant-limits",
        {
          body: {
            tenantId,
            resourceType: "drivers",
          },
        }
      );

      if (validationError) {
        console.error("Erro na validação:", validationError);
        toast.error("Erro ao validar limite de motoristas");
        return;
      }

      if (!validationData.allowed) {
        toast.error(`Limite de motoristas atingido (${validationData.limit}). Solicite upgrade para adicionar mais.`);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-driver", {
        body: {
          ...formData,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      if (!data?.success) {
        toast.error("Erro ao cadastrar entregador. Tente novamente.");
        setLoading(false);
        return;
      }

      toast.success("Entregador cadastrado com sucesso!");
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        cpf: "",
        vehicle: "",
        plate: "",
      });
      onOpenChange(false);
      
      // Aguardar 500ms antes de atualizar lista
      setTimeout(() => {
        console.log("Atualizando lista de motoristas...");
        onSuccess();
      }, 500);
    } catch (error: any) {
      console.error("Erro ao criar entregador:", error);
      toast.error(error.message || "Erro ao cadastrar entregador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Entregador</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo entregador para sua empresa
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Senha *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={formData.cpf}
              onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicle">Tipo de Veículo *</Label>
            <Select
              value={formData.vehicle}
              onValueChange={(value) => setFormData({ ...formData, vehicle: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BIKE">Bicicleta</SelectItem>
                <SelectItem value="MOTORCYCLE">Moto</SelectItem>
                <SelectItem value="CAR">Carro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="plate">Placa</Label>
            <Input
              id="plate"
              placeholder="ABC-1234"
              value={formData.plate}
              onChange={(e) => setFormData({ ...formData, plate: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
