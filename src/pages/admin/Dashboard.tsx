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
  Search,
  BarChart3,
  Settings,
  KeyRound
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminSidebar from "@/components/admin/AdminSidebar";
import ResetPasswordDialog from "@/components/admin/ResetPasswordDialog";
import { TenantsList } from "@/components/admin/TenantsList";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalClients: 0,
    ordersToday: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "admin_master") {
        navigate("/admin/login");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get total and active companies
      const { data: companies } = await (supabase
        .from("tenants") as any)
        .select("id, status");

      const totalCompanies = companies?.length || 0;
      const activeCompanies = companies?.filter((c: any) => c.status === "ACTIVE").length || 0;

      // Get total clients
      const { count: totalClients } = await (supabase
        .from("clients") as any)
        .select("*", { count: "exact", head: true });

      // Get orders today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: ordersToday } = await (supabase
        .from("orders") as any)
        .select("*", { count: "exact", head: true })
        .gte("created_at", today.toISOString());

      // Get monthly revenue
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: orders } = await (supabase
        .from("orders") as any)
        .select("total")
        .gte("created_at", firstDayOfMonth.toISOString())
        .eq("payment_status", "PAID");

      const monthlyRevenue = orders?.reduce((sum: number, order: any) => sum + Number(order.total), 0) || 0;

      setStats({
        totalCompanies,
        activeCompanies,
        totalClients: totalClients || 0,
        ordersToday: ordersToday || 0,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
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

  if (loading) {
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
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold">Dashboard Central</h1>
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-company"
                placeholder="Buscar empresa por nome ou CNPJ..."
                className="pl-10"
              />
            </div>
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
                <h2 className="text-3xl font-bold">Bem-vindo, Jeffson</h2>
                <p className="text-muted-foreground mt-1">
                  Visão geral de todas as empresas da plataforma
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
                  <div className="text-3xl font-bold">{stats.activeCompanies}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    de {stats.totalCompanies} total
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
                  <div className="text-3xl font-bold">{stats.totalClients}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    em todas as empresas
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
                  <div className="text-3xl font-bold">{stats.ordersToday}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    em processamento
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
                    }).format(stats.monthlyRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    consolidado
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
