import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, LogOut, Truck, Users, BarChart3, Activity, UserCircle, DollarSign, Settings } from "lucide-react";
import { ProductList } from "@/components/company/ProductList";
import { DriversList } from "@/components/company/DriversList";
import { OrdersManagement } from "@/components/company/OrdersManagement";
import { DriverSessionsReport } from "@/components/company/DriverSessionsReport";
import { RevenueReport } from "@/components/company/RevenueReport";
import { LiveOrdersPanel } from "@/components/company/LiveOrdersPanel";
import { ClientsList } from "@/components/company/ClientsList";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { WalletDashboard } from "@/components/company/WalletDashboard";
import { CompanySettingsDialog } from "@/components/company/CompanySettingsDialog";

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth/login");
        return;
      }

      setUser(session.user);

      // Buscar tenant_id do perfil
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) throw profileError;
      if (profileData?.tenant_id) {
        setTenantId(profileData.tenant_id);
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      navigate("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* HEADER */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Painel da Empresa</h1>
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} userRole="company" />}
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs defaultValue="visao-geral" className="w-full">
            <TabsList className="grid w-full grid-cols-8 mb-8">
              <TabsTrigger value="visao-geral">
                <Activity className="h-4 w-4 mr-2" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="pedidos">
                <BarChart3 className="h-4 w-4 mr-2" />
                Pedidos
              </TabsTrigger>
              <TabsTrigger value="produtos">
                <Package className="h-4 w-4 mr-2" />
                Produtos
              </TabsTrigger>
              <TabsTrigger value="motoristas">
                <Truck className="h-4 w-4 mr-2" />
                Motoristas
              </TabsTrigger>
              <TabsTrigger value="clientes">
                <UserCircle className="h-4 w-4 mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="carteira">
                <DollarSign className="h-4 w-4 mr-2" />
                Carteira
              </TabsTrigger>
              <TabsTrigger value="relatorios">
                <Users className="h-4 w-4 mr-2" />
                Relatórios
              </TabsTrigger>
              <TabsTrigger value="configuracoes">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visao-geral">
              {tenantId && <LiveOrdersPanel tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="pedidos">
              {tenantId && <OrdersManagement tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="produtos">
              {tenantId && <ProductList tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="motoristas">
              {tenantId && <DriversList tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="clientes">
              {tenantId && <ClientsList tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="carteira">
              {tenantId && <WalletDashboard tenantId={tenantId} />}
            </TabsContent>

            <TabsContent value="relatorios">
              <Tabs defaultValue="sessoes" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="sessoes">Sessões Motoristas</TabsTrigger>
                  <TabsTrigger value="receita">Receita e Pedidos</TabsTrigger>
                </TabsList>

                <TabsContent value="sessoes">
                  {tenantId && <DriverSessionsReport tenantId={tenantId} />}
                </TabsContent>

                <TabsContent value="receita">
                  {tenantId && <RevenueReport tenantId={tenantId} />}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="configuracoes">
              <Button onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Abrir Configurações
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {tenantId && (
        <CompanySettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          tenantId={tenantId}
        />
      )}
    </div>
  );
};

export default CompanyDashboard;