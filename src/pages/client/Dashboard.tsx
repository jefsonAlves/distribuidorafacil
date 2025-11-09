import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Package, LogOut, User, History } from "lucide-react";
import { NewOrderDialog } from "@/components/client/NewOrderDialog";
import { ProfileForm } from "@/components/client/ProfileForm";
import { OrderHistory } from "@/components/client/OrderHistory";
import { NotificationBell } from "@/components/ui/NotificationBell";

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [clientId, setClientId] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");
  const [tenantName, setTenantName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

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

      // FASE 5: Buscar ou criar registro de cliente
      let { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, tenant_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (clientError) throw clientError;

      // Se não existe, criar registro
      if (!clientData) {
        toast.error("Cliente não encontrado. Por favor, complete seu cadastro através do link fornecido pela empresa.");
        navigate("/");
        return;
      }

      if (clientData) {
        setClientId(clientData.id);
        setTenantId(clientData.tenant_id);
        
        // Buscar nome da empresa se tiver tenant_id
        if (clientData.tenant_id) {
          const { data: tenantData } = await supabase
            .from("tenants")
            .select("name")
            .eq("id", clientData.tenant_id)
            .single();
          
          if (tenantData) {
            setTenantName(tenantData.name);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      toast.error("Erro ao carregar dados. Tente novamente.");
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
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] via-white to-[#F9FAFB]">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#EF5350] to-[#E53935] flex items-center justify-center shadow-md">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#333333]">Meus Pedidos</h1>
          </div>
          <div className="flex items-center gap-3">
            {user && <NotificationBell userId={user.id} userRole="client" />}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-[#333333] hover:text-[#EF5350] transition-colors duration-300"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <Tabs defaultValue="pedidos" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white rounded-2xl p-1 shadow-md">
              <TabsTrigger 
                value="pedidos"
                className="rounded-xl data-[state=active]:bg-[#EF5350] data-[state=active]:text-white transition-all duration-300"
              >
                <Package className="h-4 w-4 mr-2" />
                Fazer Pedido
              </TabsTrigger>
              <TabsTrigger 
                value="historico"
                className="rounded-xl data-[state=active]:bg-[#EF5350] data-[state=active]:text-white transition-all duration-300"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger 
                value="perfil"
                className="rounded-xl data-[state=active]:bg-[#EF5350] data-[state=active]:text-white transition-all duration-300"
              >
                <User className="h-4 w-4 mr-2" />
                Meu Perfil
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pedidos" className="mt-8">
              <div className="text-center py-16 bg-white rounded-2xl shadow-md border border-gray-100">
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-[#EF5350]/10 to-[#E53935]/10 flex items-center justify-center mx-auto mb-6">
                  <Package className="h-10 w-10 text-[#EF5350]" />
                </div>
                <h2 className="text-3xl font-bold mb-4 text-[#333333]">Fazer Pedido</h2>
                {tenantName && (
                  <p className="text-sm text-muted-foreground mb-2">
                    Empresa: <span className="font-semibold text-[#EF5350]">{tenantName}</span>
                  </p>
                )}
                <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
                  Clique no botão abaixo para criar um novo pedido
                </p>
                <Button 
                  size="lg" 
                  onClick={() => setOrderDialogOpen(true)}
                  className="bg-[#EF5350] hover:bg-[#E53935] text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Package className="h-5 w-5 mr-2" />
                  Novo Pedido
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-8">
              {clientId && <OrderHistory clientId={clientId} />}
            </TabsContent>

            <TabsContent value="perfil" className="mt-8">
              {user && <ProfileForm userId={user.id} />}
            </TabsContent>
          </Tabs>

          {clientId && tenantId && (
            <NewOrderDialog
              open={orderDialogOpen}
              onOpenChange={setOrderDialogOpen}
              clientId={clientId}
              tenantId={tenantId}
              tenantName={tenantName}
              onSuccess={() => {
                toast.success("Pedido criado com sucesso!");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;