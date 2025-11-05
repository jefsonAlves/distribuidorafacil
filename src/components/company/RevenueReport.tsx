// FASE 4: Relatório de Pedidos e Receita
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, TrendingUp, Package, XCircle, DollarSign } from "lucide-react";

interface RevenueReportProps {
  tenantId: string;
}

export const RevenueReport = ({ tenantId }: RevenueReportProps) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    cancellationRate: 0,
    totalRevenue: 0,
    averageTicket: 0,
  });
  const [driverStats, setDriverStats] = useState<any[]>([]);

  useEffect(() => {
    fetchDrivers();
  }, [tenantId]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchReport();
    }
  }, [selectedDriver, selectedStatus, startDate, endDate]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, name")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar motoristas:", error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          drivers(id, name)
        `)
        .eq("tenant_id", tenantId)
        .gte("created_at", startDate)
        .lte("created_at", `${endDate}T23:59:59`);

      if (selectedDriver !== "all") {
        query = query.eq("assigned_driver", selectedDriver);
      }

      if (selectedStatus !== "all") {
        query = query.eq("status", selectedStatus as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      calculateStats(data || []);
      calculateDriverStats(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar relatório:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: any[]) => {
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === "ENTREGUE").length;
    const cancelledOrders = orders.filter(o => o.status === "CANCELADO").length;
    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
    
    const totalRevenue = orders
      .filter(o => o.status === "ENTREGUE")
      .reduce((sum, o) => sum + parseFloat(o.total), 0);
    
    const averageTicket = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

    setStats({
      totalOrders,
      deliveredOrders,
      cancelledOrders,
      cancellationRate,
      totalRevenue,
      averageTicket,
    });
  };

  const calculateDriverStats = (orders: any[]) => {
    const driverMap = new Map();

    orders.forEach(order => {
      if (!order.assigned_driver) return;

      const driverId = order.assigned_driver;
      const driverName = order.drivers?.name || "N/A";

      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          id: driverId,
          name: driverName,
          deliveries: 0,
          cancellations: 0,
          revenue: 0,
        });
      }

      const stats = driverMap.get(driverId);
      if (order.status === "ENTREGUE") {
        stats.deliveries++;
        stats.revenue += parseFloat(order.total);
      } else if (order.status === "CANCELADO") {
        stats.cancellations++;
      }
    });

    const statsArray = Array.from(driverMap.values()).sort((a, b) => b.deliveries - a.deliveries);
    setDriverStats(statsArray);
  };

  const exportToCSV = () => {
    if (driverStats.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["Motorista", "Entregas", "Cancelamentos", "Taxa Cancelamento (%)", "Receita"];
    const rows = driverStats.map(driver => {
      const total = driver.deliveries + driver.cancellations;
      const rate = total > 0 ? ((driver.cancellations / total) * 100).toFixed(1) : "0.0";
      return [
        driver.name,
        driver.deliveries,
        driver.cancellations,
        rate,
        `R$ ${driver.revenue.toFixed(2)}`
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receita_pedidos_${startDate}_${endDate}.csv`;
    a.click();
    
    toast.success("Relatório exportado!");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Motorista</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ENTREGUE">Entregue</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={exportToCSV} disabled={loading || driverStats.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      {!loading && startDate && endDate && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.deliveredOrders} entregues
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(stats.totalRevenue)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(stats.averageTicket)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cancelamentos</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.cancelledOrders}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.cancellationRate.toFixed(1)}% taxa
                </p>
              </CardContent>
            </Card>
          </div>

          {driverStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Desempenho por Motorista</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {driverStats.map(driver => {
                    const total = driver.deliveries + driver.cancellations;
                    const rate = total > 0 ? ((driver.cancellations / total) * 100) : 0;
                    
                    return (
                      <div key={driver.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{driver.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {driver.deliveries} entregas | {driver.cancellations} cancelamentos ({rate.toFixed(1)}%)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(driver.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">receita gerada</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
