import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NotAuthorized = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/auth/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Acesso Negado</CardTitle>
          <CardDescription className="text-base">
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema.
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate("/")} className="w-full" variant="default">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Início
            </Button>
            <Button onClick={handleLogout} className="w-full" variant="outline">
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotAuthorized;
