import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    // Verificar se já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        redirectBasedOnRole(session.user.id);
      }
    });
  }, []);

  const redirectBasedOnRole = async (userId: string) => {
    try {
      // Buscar roles do usuário
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (error) throw error;

      if (!roles || roles.length === 0) {
        toast.error("Usuário sem permissões definidas");
        await supabase.auth.signOut();
        return;
      }

      // Redirecionar baseado na role
      const userRoles = roles.map(r => r.role);
      
      if (userRoles.includes("admin_master")) {
        navigate("/admin/dashboard");
      } else if (userRoles.includes("company_admin")) {
        navigate("/company/dashboard");
      } else if (userRoles.includes("driver")) {
        navigate("/driver/dashboard");
      } else if (userRoles.includes("client")) {
        navigate("/client/dashboard");
      } else {
        toast.error("Tipo de usuário não reconhecido");
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      console.error("Erro ao verificar permissões:", error);
      toast.error("Erro ao carregar permissões do usuário");
      await supabase.auth.signOut();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Login realizado com sucesso!");
      
      if (data.user) {
        await redirectBasedOnRole(data.user.id);
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm space-y-2">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/emergency-reset")}
                  className="text-muted-foreground hover:text-primary"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div>
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="text-primary hover:underline"
                >
                  Cadastre-se
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;