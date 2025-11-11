import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  TrendingUp,
  LogOut,
  PlusCircle,
  BarChart3,
  KeyRound
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ResetPasswordDialog from "@/components/admin/ResetPasswordDialog";
import { CompanySelector } from "@/components/admin/CompanySelector";
import { useAdminStats } from "@/hooks/useAdminStats";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("all");
  const { stats, loading: statsLoading } = useAdminStats(
    selectedCompany === "all" ? undefined : selectedCompany
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      // Verificar role usando user_roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError || !roles) {
        navigate("/admin/login");
        return;
      }

      const hasAdminMaster = roles.some((r: any) => r.role === "admin_master");
      if (!hasAdminMaster) {
        navigate("/admin/login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/admin/login");
  };

  if (loading || statsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Dashboard Central</h1>
            <CompanySelector value={selectedCompany} onValueChange={setSelectedCompany} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowResetPassword(true)}
              variant="outline"
              size="sm"
              id="btn-open-reset-password"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Resetar Senha
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              id="btn-admin-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Quick Actions */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Bem-vindo, Admin Master</h2>
                <p className="text-muted-foreground mt-1">
                  {selectedCompany === "all"
                    ? "Visão geral de todas as empresas da plataforma"
                    : "Visão detalhada da empresa selecionada"}
                </p>
              </div>
              <Button
                size="lg"
                className="gradient-secondary shadow-glow"
                id="btn-open-create-company"
                onClick={() => navigate("/admin/companies")}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Nova Empresa
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card id="card-companies-active" className="transition-smooth hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Empresas Ativas
                  </CardTitle>
                  <Building2 className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalCompanies}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCompany === "all" ? "na plataforma" : "selecionada"}
                  </p>
                </CardContent>
              </Card>

              <Card id="card-total-clients" className="transition-smooth hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Clientes
                  </CardTitle>
                  <Users className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCompany === "all" ? "em todas empresas" : "na empresa"}
                  </p>
                </CardContent>
              </Card>

              <Card id="card-orders-today" className="transition-smooth hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pedidos Hoje
                  </CardTitle>
                  <ShoppingBag className="h-4 w-4 text-secondary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalOrders}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCompany === "all" ? "consolidados" : "da empresa"}
                  </p>
                </CardContent>
              </Card>

              <Card id="card-monthly-revenue" className="transition-smooth hover:shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Receita Mensal
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(stats.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCompany === "all" ? "consolidado" : "da empresa"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="cursor-pointer transition-smooth hover:shadow-lg hover:-translate-y-1" onClick={() => navigate("/admin/companies")}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Gerenciar Empresas
                  </CardTitle>
                  <CardDescription>
                    Criar, editar e gerenciar todas as empresas da plataforma
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="cursor-pointer transition-smooth hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-accent" />
                    Relatórios Globais
                  </CardTitle>
                  <CardDescription>
                    Análises e métricas consolidadas de todas as operações
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <ResetPasswordDialog
        open={showResetPassword}
        onOpenChange={setShowResetPassword}
        email="jefson.ti@gmail.com"
      />
    </div>
  );
};

export default AdminDashboard;
