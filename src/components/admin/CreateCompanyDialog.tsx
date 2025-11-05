import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CreateCompanyDialog = ({ open, onOpenChange, onSuccess }: CreateCompanyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
    domain: "",
    plan: "basic",
    primaryColor: "#3b82f6",
    secondaryColor: "#f59e0b",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate domain is unique
      const { data: existingDomain } = await (supabase
        .from("tenants") as any)
        .select("id")
        .eq("domain", formData.domain)
        .maybeSingle();

      if (existingDomain) {
        toast({
          title: "Domínio já existe",
          description: "Escolha outro domínio para esta empresa.",
          variant: "destructive",
        });
        return;
      }

      // Create tenant
      const { error } = await (supabase
        .from("tenants") as any)
        .insert({
          name: formData.name,
          cnpj: formData.cnpj,
          email: formData.email,
          phone: formData.phone,
          domain: formData.domain,
          plan: formData.plan,
          primary_color: formData.primaryColor,
          secondary_color: formData.secondaryColor,
        });

      if (error) throw error;

      toast({
        title: "Empresa criada!",
        description: "A nova empresa foi cadastrada com sucesso.",
      });

      // Reset form
      setFormData({
        name: "",
        cnpj: "",
        email: "",
        phone: "",
        domain: "",
        plan: "basic",
        primaryColor: "#3b82f6",
        secondaryColor: "#f59e0b",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" id="modal-create-company">
        <DialogHeader>
          <DialogTitle>Criar Nova Empresa</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova instância de empresa na plataforma
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input-company-name">Nome Fantasia *</Label>
              <Input
                id="input-company-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pizzaria do João"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-company-cnpj">CNPJ</Label>
              <Input
                id="input-company-cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input-company-email">Email *</Label>
              <Input
                id="input-company-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@empresa.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-company-phone">Telefone *</Label>
              <Input
                id="input-company-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input-domain-preference">Domínio/Slug *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {window.location.origin}/
              </span>
              <Input
                id="input-domain-preference"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="pizzaria-joao"
                className="flex-1"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Apenas letras minúsculas, números e hífens
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="input-color-primary">Cor Primária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="input-color-primary"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="input-color-secondary">Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="input-color-secondary"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  placeholder="#f59e0b"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="select-plan">Plano</Label>
            <Select value={formData.plan} onValueChange={(value) => setFormData({ ...formData, plan: value })}>
              <SelectTrigger id="select-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              id="btn-cancel-create-company"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="gradient-primary"
              id="btn-save-company"
            >
              {loading ? "Criando..." : "Criar Empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCompanyDialog;
