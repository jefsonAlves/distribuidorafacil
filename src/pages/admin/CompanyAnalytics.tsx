import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  TrendingUp, 
  Package, 
  DollarSign, 
  CheckCircle,
  Clock,
  Users,
  Truck
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Analytics {
  totalOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  averageTicket: number;
  conversionRate: number;
  totalClients: number;
  totalDrivers: number;
  pendingOrders: number;
}

const CompanyAnalytics = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [analytics, setAnalytics] = useState<Analytics>({
    totalOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    averageTicket: 0,
    conversionRate: 0,
    totalClients: 0,
    totalDrivers: 0,
    pendingOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30"); // dias

  useEffect(() => {
    fetchCompanyData();
    fetchAnalytics();
  }, [companyId, period]);

  const fetchCompanyData = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", companyId)
        .single();

      if (error) throw error;
      setCompanyName(data.name);
    } catch (error: any) {
      console.error("Erro ao buscar empresa:", error);
      toast.error("Erro ao carregar dados da empresa");
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Calcular data de início baseado no período
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Buscar pedidos do período
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("status, total, created_at")
        .eq("tenant_id", companyId)
        .gte("created_at", startDate.toISOString());

      if (ordersError) throw ordersError;

      // Buscar clientes
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id")
        .eq("tenant_id", companyId);

      if (clientsError) throw clientsError;

      // Buscar motoristas
      const { data: drivers, error: driversError } = await supabase
        .from("drivers")
        .select("id")
        .eq("tenant_id", companyId);

      if (driversError) throw driversError;

      // Calcular métricas
      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter((o) => o.status === "ENTREGUE").length || 0;
      const pendingOrders = orders?.filter((o) => o.status === "PENDENTE").length || 0;
      
      const totalRevenue = orders
        ?.filter((o) => o.status === "ENTREGUE")
        .reduce((sum, o) => sum + parseFloat(String(o.total || "0")), 0) || 0;

      const averageTicket = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;
      const conversionRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

      setAnalytics({
        totalOrders,
        deliveredOrders,
        totalRevenue,
        averageTicket,
        conversionRate,
        totalClients: clients?.length || 0,
        totalDrivers: drivers?.length || 0,
        pendingOrders,
      });
    } catch (error: any) {
      console.error("Erro ao buscar analytics:", error);
      toast.error("Erro ao carregar analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/companies")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Analytics - {companyName}</h1>
            <p className="text-sm text-muted-foreground">
              Métricas e estatísticas da empresa
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Cards de métricas financeiras */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {analytics.totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  De pedidos entregues
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {analytics.averageTicket.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Por pedido entregue
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <Package className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalOrders}</div>
                <p className="text-xs text-muted-foreground">
                  No período selecionado
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <CheckCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Pedidos entregues vs criados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Cards de métricas operacionais */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Entregues</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.deliveredOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Concluídos com sucesso
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.pendingOrders}</div>
                <p className="text-xs text-muted-foreground">
                  Aguardando processamento
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalClients}</div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados na empresa
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Entregadores</CardTitle>
                <Truck className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalDrivers}</div>
                <p className="text-xs text-muted-foreground">
                  Cadastrados na empresa
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Informação adicional */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Período analisado:</span>
                  <span className="font-semibold">
                    {period === "7" && "Últimos 7 dias"}
                    {period === "30" && "Últimos 30 dias"}
                    {period === "90" && "Últimos 90 dias"}
                    {period === "365" && "Último ano"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Receita média por dia:</span>
                  <span className="font-semibold">
                    R$ {(analytics.totalRevenue / parseInt(period)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Pedidos média por dia:</span>
                  <span className="font-semibold">
                    {(analytics.totalOrders / parseInt(period)).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-muted-foreground">Status da empresa:</span>
                  <span className="font-semibold text-green-500">
                    ✓ Operando normalmente
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CompanyAnalytics;
