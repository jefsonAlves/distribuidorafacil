import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, User, Truck, ArrowLeft, Flame } from "lucide-react";

type UserType = "company" | "driver" | "client";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companySlug = searchParams.get("company");
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>("client");
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  // Campos comuns
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  
  // Campos específicos
  const [cpf, setCpf] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vehicle, setVehicle] = useState("");

  // Buscar tenant pelo slug se fornecido
  useEffect(() => {
    if (companySlug) {
      fetchTenantBySlug();
    }
  }, [companySlug]);

  const fetchTenantBySlug = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("slug", companySlug)
        .single();

      if (error) {
        console.error("Erro ao buscar empresa:", error);
        toast.error("Empresa não encontrada. Verifique o link.");
        navigate("/");
        return;
      }

      if (data) {
        setTenantId(data.id);
        setUserType("client");
        toast.success(`Cadastro para: ${data.name}`);
      }
    } catch (error) {
      console.error("Erro ao buscar tenant:", error);
      toast.error("Erro ao carregar informações da empresa");
      navigate("/");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Se for empresa, usar edge function
      if (userType === "company") {
        const { data, error } = await supabase.functions.invoke('create-company', {
          body: {
            email,
            password,
            fullName,
            companyName,
            cnpj,
            phone,
          }
        });

        if (error) throw error;
        if (!data.success) throw new Error(data.error);

        toast.success("🎉 Empresa cadastrada com sucesso!");
        toast.info("Suas funcionalidades serão liberadas pelo administrador.");
        
        setTimeout(() => {
          navigate("/auth/login");
        }, 3000);
        return;
      }

      // Para cliente e driver, usar fluxo normal
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/login`,
          data: {
            full_name: fullName,
            user_type: userType,
            phone,
            cpf: userType === "client" ? cpf : undefined,
            vehicle: userType === "driver" ? vehicle : undefined,
          },
        },
      });

      if (error) throw error;

      // Se for cliente via link, atualizar profile e adicionar role
      if (companySlug && tenantId && data.user) {
        const userId = data.user.id;

        // Atualizar profile com tenant_id
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ tenant_id: tenantId })
          .eq("id", userId);

        if (profileError) {
          console.error("Erro ao atualizar profile:", profileError);
          toast.error("Erro ao vincular sua conta à empresa. Tente novamente mais tarde.");
        }

        // Inserir role client
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "client" });

        if (roleError) {
          console.error("Erro ao inserir role:", roleError);
          toast.error("Erro ao definir seu tipo de usuário. Tente novamente mais tarde.");
        }
      }

      toast.success("Cadastro realizado com sucesso!");
      toast.info("Você será redirecionado para fazer login...");
      
      setTimeout(() => {
        navigate("/auth/login");
      }, 2000);
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EF5350]/5 via-[#F9FAFB] to-white p-4 py-12">
      <Card className="w-full max-w-lg rounded-2xl shadow-xl border-0">
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
            <CardTitle className="text-3xl font-bold text-[#333333]">Criar Conta</CardTitle>
          </div>
          <CardDescription className="text-base text-gray-600">
            Escolha o tipo de cadastro e preencha seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            {/* SELEÇÃO DE TIPO */}
            {!companySlug && (
              <div className="space-y-3">
                <Label className="text-[#333333] font-medium">Tipo de Cadastro</Label>
                <RadioGroup value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                  <div className="flex items-center space-x-3 border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#EF5350] hover:bg-[#EF5350]/5 transition-all duration-300">
                    <RadioGroupItem value="client" id="client" className="border-[#EF5350] text-[#EF5350]" />
                    <Label htmlFor="client" className="flex items-center gap-3 cursor-pointer flex-1">
                      <User className="h-6 w-6 text-[#EF5350]" />
                      <div>
                        <div className="font-semibold text-[#333333]">Cliente</div>
                        <div className="text-sm text-gray-600">Fazer pedidos</div>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 border-2 border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#264653] hover:bg-[#264653]/5 transition-all duration-300">
                    <RadioGroupItem value="company" id="company" className="border-[#264653] text-[#264653]" />
                    <Label htmlFor="company" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Building2 className="h-6 w-6 text-[#264653]" />
                      <div>
                        <div className="font-semibold text-[#333333]">Empresa</div>
                        <div className="text-sm text-gray-600">Gerenciar negócio</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* CAMPOS COMUNS */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-[#333333] font-medium">Nome Completo *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#333333] font-medium">Email *</Label>
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
                <Label htmlFor="phone" className="text-[#333333] font-medium">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#333333] font-medium">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                />
              </div>
            </div>

            {/* CAMPOS ESPECÍFICOS POR TIPO */}
            {userType === "company" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-[#333333] font-medium">Razão Social *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-[#333333] font-medium">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    required
                    className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                  />
                </div>
              </div>
            )}

            {userType === "client" && (
              <div className="space-y-2">
                <Label htmlFor="cpf" className="text-[#333333] font-medium">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="rounded-xl border-gray-200 focus:border-[#EF5350] focus:ring-[#EF5350] transition-all duration-300"
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#EF5350] hover:bg-[#E53935] text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 h-12 text-base font-semibold" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-[#EF5350] hover:text-[#E53935] font-semibold transition-colors duration-300"
              >
                Entrar
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;