import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2,
  Plus,
  Edit2,
  Link as LinkIcon,
  Power,
  Copy,
  ExternalLink
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import AdminSidebar from "@/components/admin/AdminSidebar";
import CreateCompanyDialog from "@/components/admin/CreateCompanyDialog";

interface Tenant {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  domain: string | null;
  status: string;
  plan: string;
  created_at: string;
}

const AdminCompanies = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Tenant[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    checkAuth();
    loadCompanies();
  }, []);

  const checkAuth = async () => {
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
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase
        .from("tenants") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar empresas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyAppLink = (domain: string | null) => {
    if (!domain) {
      toast({
        title: "Domínio não configurado",
        description: "Configure um domínio para esta empresa primeiro.",
        variant: "destructive",
      });
      return;
    }

    const link = `${window.location.origin}/${domain}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado!",
      description: "O link do app foi copiado para a área de transferência.",
    });
  };

  const toggleCompanyStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    
    try {
      const { error } = await (supabase
        .from("tenants") as any)
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Empresa ${newStatus === "ACTIVE" ? "ativada" : "suspensa"} com sucesso.`,
      });

      loadCompanies();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Gerenciar Empresas</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {companies.length} empresa{companies.length !== 1 ? "s" : ""} cadastrada{companies.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button
              size="lg"
              className="gradient-secondary shadow-glow"
              onClick={() => setShowCreateDialog(true)}
              id="btn-open-create-company"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nova Empresa
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="h-12 w-12 mx-auto rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <p className="text-muted-foreground">Carregando empresas...</p>
                </div>
              </div>
            ) : companies.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Building2 className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma empresa cadastrada</h3>
                  <p className="text-muted-foreground mb-6 text-center max-w-md">
                    Crie a primeira empresa para começar a usar a plataforma
                  </p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    className="gradient-primary"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Criar Primeira Empresa
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{company.name}</div>
                            {company.domain && (
                              <div className="text-sm text-muted-foreground">
                                /{company.domain}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {company.cnpj || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{company.email || "-"}</div>
                            <div className="text-muted-foreground">{company.phone || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={company.status === "ACTIVE" ? "default" : "destructive"}
                          >
                            {company.status === "ACTIVE" ? "Ativa" : "Suspensa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{company.plan}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyAppLink(company.domain)}
                              id={`btn-copy-link-${company.id}`}
                              title="Copiar link do app"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleCompanyStatus(company.id, company.status)}
                              id={`btn-toggle-status-${company.id}`}
                              title={company.status === "ACTIVE" ? "Suspender" : "Ativar"}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              id={`btn-edit-company-${company.id}`}
                              title="Editar empresa"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </main>
      </div>

      <CreateCompanyDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={loadCompanies}
      />
    </div>
  );
};

export default AdminCompanies;
