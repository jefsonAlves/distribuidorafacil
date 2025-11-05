// FASE 3: Relatório de Sessões de Motoristas
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Download, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DriverSessionsReportProps {
  tenantId: string;
}

export const DriverSessionsReport = ({ tenantId }: DriverSessionsReportProps) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalHours: 0,
    avgHours: 0,
  });

  useEffect(() => {
    fetchDrivers();
  }, [tenantId]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSessions();
    }
  }, [selectedDriver, startDate, endDate]);

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

  const fetchSessions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("driver_sessions")
        .select(`
          *,
          drivers(name)
        `)
        .eq("tenant_id", tenantId)
        .gte("started_at", startDate)
        .lte("started_at", `${endDate}T23:59:59`)
        .order("started_at", { ascending: false });

      if (selectedDriver !== "all") {
        query = query.eq("driver_id", selectedDriver);
      }

      const { data, error } = await query;
      if (error) throw error;

      setSessions(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar sessões:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData: any[]) => {
    const totalSessions = sessionsData.length;
    let totalSeconds = 0;

    sessionsData.forEach(session => {
      const start = new Date(session.started_at);
      const end = session.ended_at ? new Date(session.ended_at) : new Date();
      totalSeconds += (end.getTime() - start.getTime()) / 1000;
    });

    const totalHours = totalSeconds / 3600;
    const avgHours = totalSessions > 0 ? totalHours / totalSessions : 0;

    setStats({
      totalSessions,
      totalHours,
      avgHours,
    });
  };

  const formatDuration = (startedAt: string, endedAt: string | null) => {
    const start = new Date(startedAt);
    const end = endedAt ? new Date(endedAt) : new Date();
    const diffSeconds = (end.getTime() - start.getTime()) / 1000;
    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  const exportToCSV = () => {
    if (sessions.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const headers = ["Motorista", "Data Início", "Hora Início", "Data Fim", "Hora Fim", "Tempo Online", "Status"];
    const rows = sessions.map(session => [
      session.drivers?.name || "N/A",
      new Date(session.started_at).toLocaleDateString("pt-BR"),
      new Date(session.started_at).toLocaleTimeString("pt-BR"),
      session.ended_at ? new Date(session.ended_at).toLocaleDateString("pt-BR") : "-",
      session.ended_at ? new Date(session.ended_at).toLocaleTimeString("pt-BR") : "-",
      formatDuration(session.started_at, session.ended_at),
      session.ended_at ? "Finalizada" : "Ativa"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sessoes_motoristas_${startDate}_${endDate}.csv`;
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Motorista</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Motoristas</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
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

          <Button onClick={exportToCSV} disabled={loading || sessions.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      {sessions.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total de Sessões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalSessions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tempo Total Online</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalHours.toFixed(1)}h</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Média por Sessão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.avgHours.toFixed(1)}h</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sessões</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{session.drivers?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.started_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDuration(session.started_at, session.ended_at)}
                        </span>
                      </div>
                      <Badge variant={session.ended_at ? "secondary" : "default"}>
                        {session.ended_at ? "Finalizada" : "Ativa"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!loading && sessions.length === 0 && startDate && endDate && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma sessão encontrada no período selecionado.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
