import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, User } from "lucide-react";
import { AvailabilityToggle } from "@/components/driver/AvailabilityToggle";
import { OrdersList } from "@/components/driver/OrdersList";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { DriverProfileDialog } from "@/components/driver/DriverProfileDialog";

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [driverId, setDriverId] = useState<string>("");
  const [tenantId, setTenantId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth/login");
        return;
      }

      setUser(session.user);

      // Verificar se usuário tem role de driver
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      if (rolesError) throw rolesError;

      const isDriver = roles?.some(r => r.role === "driver");
      
      if (!isDriver) {
        toast.error("Acesso negado: você não tem permissão de entregador");
        await supabase.auth.signOut();
        navigate("/auth/login");
        return;
      }

      // Buscar dados do motorista
      const { data: driverData, error: driverError } = await supabase
        .from("drivers")
        .select("id, tenant_id")
        .eq("user_id", session.user.id)
        .single();

      if (driverError || !driverData) {
        toast.error("Cadastro de entregador não encontrado. Entre em contato com o suporte.");
        await supabase.auth.signOut();
        navigate("/auth/login");
        return;
      }

      setDriverId(driverData.id);
      setTenantId(driverData.tenant_id);
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/auth/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* HEADER */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Minhas Entregas</h1>
          <div className="flex items-center gap-2">
            {user && <NotificationBell userId={user.id} userRole="driver" />}
            <Button variant="ghost" size="sm" onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4 mr-2" />
              Perfil
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {driverId && tenantId && (
            <>
              <AvailabilityToggle driverId={driverId} tenantId={tenantId} />
              <OrdersList driverId={driverId} />
            </>
          )}
        </div>
      </div>

      {driverId && (
        <DriverProfileDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          driverId={driverId}
        />
      )}
    </div>
  );
};

export default DriverDashboard;