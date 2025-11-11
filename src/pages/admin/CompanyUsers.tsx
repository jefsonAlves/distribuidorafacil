import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  Key,
  Shield,
  Truck,
  User as UserIcon 
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
  roles: string[];
}

const CompanyUsers = () => {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<"activate" | "deactivate" | null>(null);

  useEffect(() => {
    fetchCompanyData();
    fetchUsers();
  }, [companyId]);

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

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar todos os profiles da empresa
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", companyId);

      if (profilesError) throw profilesError;

      // Buscar roles de cada usuário
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          return {
            ...profile,
            roles: roles?.map((r) => r.role) || [],
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!selectedUser) return;

    try {
      const newStatus = !selectedUser.is_active;

      const { error } = await supabase
        .from("profiles")
        .update({ is_active: newStatus })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success(
        newStatus
          ? `Usuário ${selectedUser.full_name} ativado com sucesso!`
          : `Usuário ${selectedUser.full_name} desativado com sucesso!`
      );

      fetchUsers();
      setSelectedUser(null);
      setActionType(null);
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do usuário");
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "company_admin":
        return <Shield className="h-4 w-4 text-primary" />;
      case "driver":
        return <Truck className="h-4 w-4 text-blue-500" />;
      case "client":
        return <UserIcon className="h-4 w-4 text-muted-foreground" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      company_admin: "Admin Empresa",
      driver: "Entregador",
      client: "Cliente",
    };
    return labels[role] || role;
  };

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando usuários...</p>
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
            <h1 className="text-xl font-bold">Usuários - {companyName}</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie usuários desta empresa
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Barra de pesquisa */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas rápidas */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter((u) => u.is_active).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Inativos</CardTitle>
                <UserX className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {users.filter((u) => !u.is_active).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name || "Sem nome"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline" className="flex items-center gap-1">
                                {getRoleIcon(role)}
                                {getRoleLabel(role)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant={user.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setActionType(user.is_active ? "deactivate" : "activate");
                              }}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-1" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Ativar
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog de confirmação */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "activate" ? "Ativar" : "Desativar"} Usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "activate" ? (
                <>
                  Tem certeza que deseja <strong>ativar</strong> o usuário{" "}
                  <strong>{selectedUser?.full_name}</strong>?
                  <br />
                  Ele poderá acessar o sistema novamente.
                </>
              ) : (
                <>
                  Tem certeza que deseja <strong>desativar</strong> o usuário{" "}
                  <strong>{selectedUser?.full_name}</strong>?
                  <br />
                  Ele não poderá mais acessar o sistema até ser reativado.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleActive}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CompanyUsers;
