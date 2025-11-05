// FASE 7: Lista de Empresas (Tenants) para SuperAdmin
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Search, DollarSign, Edit } from "lucide-react";
import CreateCompanyDialog from "./CreateCompanyDialog";
import { TenantBillingDialog } from "./TenantBillingDialog";

export const TenantsList = () => {
  const [tenants, setTenants] = useState<any[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTenants(tenants);
    } else {
      const filtered = tenants.filter(
        (tenant) =>
          tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tenant.cnpj?.includes(searchTerm) ||
          tenant.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTenants(filtered);
    }
  }, [searchTerm, tenants]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          billing_configs(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTenants(data || []);
      setFilteredTenants(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar empresas:", error);
      toast.error("Erro ao carregar empresas");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      const { error } = await supabase
        .from("tenants")
        .update({ status: newStatus as any })
        .eq("id", tenantId);

      if (error) throw error;
      toast.success(`Empresa ${newStatus === "ACTIVE" ? "ativada" : "suspensa"}`);
      fetchTenants();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status da empresa");
    }
  };

  const getStatusColor = (status: string) => {
    return status === "ACTIVE" ? "bg-green-500" : "bg-red-500";
  };

  const getBillingLabel = (billing: any) => {
    if (!billing) return "Não configurado";
    if (billing.billing_type === "percentage") {
      return `${billing.value}% por venda`;
    }
    return `R$ ${parseFloat(billing.value).toFixed(2)}/mês`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Empresas Cadastradas</h2>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Building2 className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou email..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando empresas...
          </CardContent>
        </Card>
      ) : filteredTenants.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTenants.map((tenant) => (
            <Card key={tenant.id} className="hover:shadow-lg transition-smooth">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{tenant.name}</CardTitle>
                    {tenant.cnpj && (
                      <p className="text-sm text-muted-foreground mt-1">
                        CNPJ: {tenant.cnpj}
                      </p>
                    )}
                    {tenant.email && (
                      <p className="text-sm text-muted-foreground">
                        Email: {tenant.email}
                      </p>
                    )}
                  </div>
                  <Badge className={getStatusColor(tenant.status)}>
                    {tenant.status === "ACTIVE" ? "Ativa" : "Suspensa"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium capitalize">{tenant.plan || "Básico"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cobrança</p>
                    <p className="font-medium">
                      {getBillingLabel(tenant.billing_configs?.[0])}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="font-medium">
                      {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTenant(tenant);
                      setShowBillingDialog(true);
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Config. Cobrança
                  </Button>

                  <Button
                    size="sm"
                    variant={tenant.status === "ACTIVE" ? "destructive" : "default"}
                    onClick={() => toggleStatus(tenant.id, tenant.status)}
                  >
                    {tenant.status === "ACTIVE" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateCompanyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchTenants}
      />

      {selectedTenant && (
        <TenantBillingDialog
          open={showBillingDialog}
          onOpenChange={setShowBillingDialog}
          tenant={selectedTenant}
          onSuccess={fetchTenants}
        />
      )}
    </div>
  );
};
