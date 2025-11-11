// FASE 5: Painel de Controle em Tempo Real
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  Users, 
  TrendingUp,
  AlertCircle 
} from "lucide-react";

interface LiveOrdersPanelProps {
  tenantId: string;
}

export const LiveOrdersPanel = ({ tenantId }: LiveOrdersPanelProps) => {
  const [stats, setStats] = useState({
    pending: 0,
    preparing: 0,
    onWay: 0,
    deliveredToday: 0,
    driversOnline: 0,
    conversionRate: 0,
  });
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchActiveOrders();
    setupRealtime();
  }, [tenantId]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Pedidos por status
      const { data: orders } = await supabase
        .from("orders")
        .select("status")
        .eq("tenant_id", tenantId)
        .gte("created_at", today.toISOString());

      const pending = orders?.filter((o) => o.status === "PENDENTE").length || 0;
      const preparing = orders?.filter((o) => o.status === "EM_PREPARO").length || 0;
      const onWay = orders?.filter((o) => o.status === "A_CAMINHO" || o.status === "NA_PORTA" || o.status === "PENDENTE").length || 0;
      const deliveredToday = orders?.filter((o) => o.status === "ENTREGUE").length || 0;
      const total = orders?.length || 0;
      const conversionRate = total > 0 ? (deliveredToday / total) * 100 : 0;

      // Motoristas online (com sessão ativa)
      const { data: sessions } = await supabase
        .from("driver_sessions")
        .select("driver_id")
        .eq("tenant_id", tenantId)
        .is("ended_at", null);

      const driversOnline = sessions?.length || 0;

      setStats({
        pending,
        preparing,
        onWay,
        deliveredToday,
        driversOnline,
        conversionRate,
      });
    } catch (error: any) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients(full_name),
          drivers(name)
        `)
        .eq("tenant_id", tenantId)
        .in("status", ["PENDENTE", "ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setActiveOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos ativos:", error);
    }
  };

  const setupRealtime = () => {
    const ordersChannel = supabase
      .channel("live_orders_panel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchStats();
          fetchActiveOrders();
        }
      )
      .subscribe();

    const sessionsChannel = supabase
      .channel("live_driver_sessions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "driver_sessions",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(sessionsChannel);
    };
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDENTE: "bg-yellow-500",
      ACEITO: "bg-blue-500",
      EM_PREPARO: "bg-purple-500",
      A_CAMINHO: "bg-indigo-500",
      NA_PORTA: "bg-orange-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h atrás`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando dados em tempo real...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando processamento</p>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Preparo</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.preparing}</div>
            <p className="text-xs text-muted-foreground mt-1">Sendo preparados agora</p>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Caminho</CardTitle>
            <Truck className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.onWay}</div>
            <p className="text-xs text-muted-foreground mt-1">Em rota de entrega</p>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregues Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.deliveredToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Concluídos com sucesso</p>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Motoristas Online</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.driversOnline}</div>
            <p className="text-xs text-muted-foreground mt-1">Disponíveis agora</p>
          </CardContent>
        </Card>

        <Card className="transition-smooth hover:shadow-lg border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Pedidos entregues hoje</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Pedidos Ativos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedidos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pedido ativo no momento
            </p>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-md transition-smooth"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">#{order.id.slice(0, 8)}</span>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                      {order.status === "A_CAMINHO" && (
                        <Badge variant="outline" className="animate-pulse">
                          <Truck className="h-3 w-3 mr-1" />
                          Em rota
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.clients?.full_name || "Cliente"} • {getTimeAgo(order.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">R$ {parseFloat(order.total).toFixed(2)}</div>
                    {order.drivers && (
                      <p className="text-xs text-muted-foreground">{order.drivers.name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
