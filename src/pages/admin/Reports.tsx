import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanySelector } from "@/components/admin/CompanySelector";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, ShoppingCart, Users, Truck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

interface ReportStats {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  totalDrivers: number;
  ordersData: { month: string; orders: number; revenue: number }[];
}

const Reports = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [period, setPeriod] = useState<string>("month");
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalClients: 0,
    totalDrivers: 0,
    ordersData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [selectedCompany, period]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      let ordersQuery = supabase.from("orders").select("*");
      let clientsQuery = supabase.from("clients").select("*", { count: "exact", head: true });
      let driversQuery = supabase.from("drivers").select("*", { count: "exact", head: true });

      if (selectedCompany !== "all") {
        ordersQuery = ordersQuery.eq("tenant_id", selectedCompany);
        clientsQuery = clientsQuery.eq("tenant_id", selectedCompany);
        driversQuery = driversQuery.eq("tenant_id", selectedCompany);
      }

      const [ordersRes, clientsRes, driversRes] = await Promise.all([
        ordersQuery,
        clientsQuery,
        driversQuery,
      ]);

      const orders = ordersRes.data || [];
      const totalRevenue = orders
        .filter((o) => o.status === "ENTREGUE")
        .reduce((sum, o) => sum + Number(o.total), 0);

      // Agrupar pedidos por mês
      const monthlyData = orders.reduce((acc: any, order) => {
        const month = new Date(order.created_at).toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        if (!acc[month]) {
          acc[month] = { month, orders: 0, revenue: 0 };
        }
        acc[month].orders += 1;
        if (order.status === "ENTREGUE") {
          acc[month].revenue += Number(order.total);
        }
        return acc;
      }, {});

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalClients: clientsRes.count || 0,
        totalDrivers: driversRes.count || 0,
        ordersData: Object.values(monthlyData),
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar />
      <main className="flex-1 p-8 bg-background">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Relatórios</h1>
            <div className="flex gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última Semana</SelectItem>
                  <SelectItem value="month">Último Mês</SelectItem>
                  <SelectItem value="year">Último Ano</SelectItem>
                </SelectContent>
              </Select>
              <CompanySelector value={selectedCompany} onValueChange={setSelectedCompany} />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalOrders}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalClients}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total de Motoristas</CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalDrivers}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Pedidos e Receita por Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      orders: { label: "Pedidos", color: "hsl(var(--primary))" },
                      revenue: { label: "Receita (R$)", color: "hsl(var(--secondary))" },
                    }}
                    className="h-[300px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ordersData}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" name="Pedidos" />
                        <Bar dataKey="revenue" fill="hsl(var(--secondary))" name="Receita (R$)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;
