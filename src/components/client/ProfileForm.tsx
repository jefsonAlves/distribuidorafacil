import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ProfileFormProps {
  userId: string;
}

export const ProfileForm = ({ userId }: ProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    cpf: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetchClientData();
  }, [userId]);

  const fetchClientData = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      if (data) {
        setClient(data);
        setFormData({
          full_name: data.full_name || "",
          cpf: data.cpf || "",
          phone: data.phone || "",
          email: data.email || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("clients")
        .update(formData)
        .eq("id", client.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">Meu Perfil</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Nome Completo</Label>
          <Input
            id="full_name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={formData.cpf}
            onChange={(e) => {
              const { maskCPF } = require("@/lib/validators");
              setFormData({ ...formData, cpf: maskCPF(e.target.value) });
            }}
            maxLength={14}
          />
        </div>

        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => {
              const { maskPhone } = require("@/lib/validators");
              setFormData({ ...formData, phone: maskPhone(e.target.value) });
            }}
            maxLength={15}
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </Card>
  );
};
