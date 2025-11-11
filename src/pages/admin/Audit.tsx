import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Shield,
  User,
  Clock
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: number;
  action: string;
  resource: string;
  actor_id: string;
  tenant_id: string | null;
  details: any;
  created_at: string;
  actor_email?: string;
  tenant_name?: string;
}

const Audit = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range((page - 1) * logsPerPage, page * logsPerPage - 1);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enriquecer com dados de usuário e empresa
      const enrichedLogs = await Promise.all(
        (data || []).map(async (log) => {
          // Buscar email do ator
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", log.actor_id)
            .single();

          // Buscar nome da empresa se houver tenant_id
          let tenantName = null;
          if (log.tenant_id) {
            const { data: tenant } = await supabase
              .from("tenants")
              .select("name")
              .eq("id", log.tenant_id)
              .single();
            tenantName = tenant?.name;
          }

          return {
            ...log,
            actor_email: profile?.email,
            tenant_name: tenantName,
          };
        })
      );

      setLogs(enrichedLogs);
    } catch (error: any) {
      console.error("Erro ao buscar logs:", error);
      toast.error("Erro ao carregar logs de auditoria");
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      create: { variant: "default", label: "Criação" },
      update: { variant: "secondary", label: "Atualização" },
      delete: { variant: "destructive", label: "Exclusão" },
      activate: { variant: "default", label: "Ativação" },
      deactivate: { variant: "destructive", label: "Desativação" },
      reset_password: { variant: "secondary", label: "Reset Senha" },
    };

    const config = actionMap[action] || { variant: "default" as const, label: action };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.actor_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenant_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando logs...</p>
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
            onClick={() => navigate("/admin/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Logs de Auditoria</h1>
            <p className="text-sm text-muted-foreground">
              Histórico de ações administrativas
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por usuário, recurso ou empresa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as ações</SelectItem>
                    <SelectItem value="create">Criação</SelectItem>
                    <SelectItem value="update">Atualização</SelectItem>
                    <SelectItem value="delete">Exclusão</SelectItem>
                    <SelectItem value="activate">Ativação</SelectItem>
                    <SelectItem value="deactivate">Desativação</SelectItem>
                    <SelectItem value="reset_password">Reset Senha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de logs */}
          <Card>
            <CardHeader>
              <CardTitle>Registros de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Ator</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum log encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </div>
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="font-medium">{log.resource}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{log.actor_email || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.tenant_name ? (
                            <Badge variant="outline">{log.tenant_name}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <pre className="text-xs text-muted-foreground max-w-[200px] overflow-hidden text-ellipsis">
                            {JSON.stringify(log.details, null, 2).substring(0, 50)}...
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Paginação */}
          <div className="flex justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <Button variant="outline" disabled>
              Página {page}
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={logs.length < logsPerPage}
            >
              Próxima
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;
