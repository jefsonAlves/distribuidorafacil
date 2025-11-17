import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft, Flame } from "lucide-react";

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
      // Buscar roles do usuário com retry (para lidar com problemas de sincronização)
      let roles = null;
      let error = null;
      
      for (let i = 0; i < 3; i++) {
        const result = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);
        
        roles = result.data;
        error = result.error;
        
        if (roles && roles.length > 0) break;
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 500)); // Aguardar 500ms antes de tentar novamente
      }

      if (error) throw error;

      // Se não tem role, tentar criar usando edge function
      if (!roles || roles.length === 0) {
        console.log("Usuário sem role detectado, tentando criar automaticamente...");
        
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          if (!sessionData.session) {
            throw new Error("Sem sessão ativa");
          }

          // Chamar edge function para criar role
          const { data: roleData, error: roleFunctionError } = await supabase.functions.invoke(
            'create-user-role',
            {
              headers: {
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            }
          );

          if (!roleFunctionError && roleData?.success) {
            console.log(`Role ${roleData.role} criada automaticamente via edge function`);
            // Buscar novamente
            for (let i = 0; i < 3; i++) {
              const retryResult = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", userId);
              
              if (retryResult.data && retryResult.data.length > 0) {
                roles = retryResult.data;
                break;
              }
              if (i < 2) await new Promise(resolve => setTimeout(resolve, 500));
            }
          } else {
            console.error("Erro ao criar role via edge function:", roleFunctionError || roleData?.error);
          }
        } catch (createError) {
          console.error("Erro ao tentar criar role:", createError);
        }

        // Se ainda não tem role após tentar criar
        if (!roles || roles.length === 0) {
          toast.error("Usuário sem permissões definidas. Entre em contato com o suporte.");
          await supabase.auth.signOut();
          return;
        }
      }

      // Redirecionar baseado na role
      const userRoles = roles.map(r => r.role);
      
      if (userRoles.includes("admin_master")) {
        navigate("/admin/dashboard");
      } else if (userRoles.includes("company_admin")) {
        navigate("/company/dashboard");
      } else if (userRoles.includes("driver")) {
        // Verificar se o registro de driver existe
        const { data: driverData } = await supabase
          .from("drivers")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        
        if (driverData) {
          navigate("/driver/dashboard");
        } else {
          toast.warning("Perfil de entregador não configurado. Contate a empresa.");
          navigate("/");
        }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EF5350]/5 via-[#F9FAFB] to-white p-4">
      <Card className="w-full max-w-md rounded-2xl shadow-xl border-0">
        <CardHeader className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4 w-fit text-[#333333] hover:text-[#EF5350] transition-colors duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#EF5350] to-[#E53935] flex items-center justify-center shadow-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-[#333333]">Entrar</CardTitle>
          </div>
          <CardDescription className="text-base text-gray-600">
            Acesse sua conta para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#333333] font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#333333] font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#EF5350] transition-colors duration-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#EF5350] hover:bg-[#E53935] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-12 text-base font-semibold" 
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center text-sm space-y-3 pt-2">
              <div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/emergency-reset")}
                  className="text-gray-600 hover:text-[#EF5350] transition-colors duration-300"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="text-gray-600">
                Não tem uma conta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/auth/register")}
                  className="text-[#EF5350] hover:text-[#E53935] font-semibold transition-colors duration-300"
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