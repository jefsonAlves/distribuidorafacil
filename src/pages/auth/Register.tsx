import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, User, Truck, ArrowLeft } from "lucide-react";

type UserType = "company" | "driver" | "client";

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>("client");
  
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            phone,
            cpf: userType !== "company" ? cpf : undefined,
            cnpj: userType === "company" ? cnpj : undefined,
            company_name: userType === "company" ? companyName : undefined,
            vehicle: userType === "driver" ? vehicle : undefined,
          },
        },
      });

      if (error) throw error;

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-lg">
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
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Escolha o tipo de cadastro e preencha seus dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-6">
            {/* SELEÇÃO DE TIPO */}
            <div className="space-y-3">
              <Label>Tipo de Cadastro</Label>
              <RadioGroup value={userType} onValueChange={(value) => setUserType(value as UserType)}>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="client" id="client" />
                  <Label htmlFor="client" className="flex items-center gap-2 cursor-pointer flex-1">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Cliente</div>
                      <div className="text-xs text-muted-foreground">Fazer pedidos</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="company" id="company" />
                  <Label htmlFor="company" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Building2 className="h-5 w-5 text-accent" />
                    <div>
                      <div className="font-medium">Empresa</div>
                      <div className="text-xs text-muted-foreground">Gerenciar negócio</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="driver" id="driver" />
                  <Label htmlFor="driver" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Truck className="h-5 w-5 text-secondary" />
                    <div>
                      <div className="font-medium">Entregador</div>
                      <div className="text-xs text-muted-foreground">Realizar entregas</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* CAMPOS COMUNS */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* CAMPOS ESPECÍFICOS POR TIPO */}
            {userType === "company" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Razão Social *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {userType === "driver" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="vehicle">Veículo *</Label>
                  <Input
                    id="vehicle"
                    placeholder="Ex: Moto Honda CG 160"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {userType === "client" && (
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cadastrando..." : "Criar Conta"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => navigate("/auth/login")}
                className="text-primary hover:underline"
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