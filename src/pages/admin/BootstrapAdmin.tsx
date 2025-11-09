import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Loader2 } from "lucide-react";

const BootstrapAdmin = () => {
  const [loading, setLoading] = useState(false);
  const [maintenanceToken, setMaintenanceToken] = useState("");
  const [email, setEmail] = useState("jefson.ti@gmail.com");
  const [password, setPassword] = useState("Master@2025!");

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin", {
        body: { email, newPassword: password },
        headers: {
          "x-maintenance-token": maintenanceToken,
        },
      });

      if (error) throw error;

      console.log("Bootstrap result:", data);
      toast.success("Admin master configurado com sucesso!");
      toast.info(`Email: ${email} | Senha: ${password}`);
    } catch (error: any) {
      console.error("Erro ao configurar admin:", error);
      toast.error(error.message || "Erro ao configurar admin master");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold">Bootstrap Admin</CardTitle>
          </div>
          <CardDescription>
            Configure ou redefina o admin master do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maintenanceToken">Token de Manutenção *</Label>
              <Input
                id="maintenanceToken"
                type="password"
                value={maintenanceToken}
                onChange={(e) => setMaintenanceToken(e.target.value)}
                placeholder="Token configurado no backend"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email do Admin *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Executar Bootstrap
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default BootstrapAdmin;
