import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Power } from "lucide-react";
import { toast } from "sonner";

interface AvailabilityToggleProps {
  driverId: string;
  tenantId: string;
}

export const AvailabilityToggle = ({ driverId, tenantId }: AvailabilityToggleProps) => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetchDriverStatus();
  }, [driverId]);

  const fetchDriverStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("status")
        .eq("id", driverId)
        .single();

      if (error) throw error;
      setIsAvailable(data.status === 'ACTIVE');

      // Buscar sessão ativa se houver
      if (data.status === 'ACTIVE') {
        const { data: sessionData } = await supabase
          .from("driver_sessions")
          .select("id")
          .eq("driver_id", driverId)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (sessionData) {
          setCurrentSessionId(sessionData.id);
        }
      }
    } catch (error: any) {
      console.error("Erro ao buscar status:", error);
    }
  };

  const toggleAvailability = async () => {
    setLoading(true);
    try {
      const newStatus = isAvailable ? 'INACTIVE' : 'ACTIVE';

      // Atualizar status do motorista
      const { error: updateError } = await supabase
        .from("drivers")
        .update({ status: newStatus })
        .eq("id", driverId);

      if (updateError) throw updateError;

      if (newStatus === 'ACTIVE') {
        // Iniciar nova sessão
        const { data: sessionData, error: sessionError } = await supabase
          .from("driver_sessions")
          .insert({
            driver_id: driverId,
            tenant_id: tenantId,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (sessionError) throw sessionError;
        setCurrentSessionId(sessionData.id);
        toast.success("Você está disponível para entregas!");
      } else {
        // Finalizar sessão ativa
        if (currentSessionId) {
          const { error: sessionError } = await supabase
            .from("driver_sessions")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", currentSessionId);

          if (sessionError) throw sessionError;
          setCurrentSessionId(null);
        }
        toast.success("Você está indisponível para entregas");
      }

      setIsAvailable(!isAvailable);
    } catch (error: any) {
      console.error("Erro ao alterar disponibilidade:", error);
      toast.error("Erro ao alterar disponibilidade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg mb-1">Status de Disponibilidade</h3>
          <p className="text-sm text-muted-foreground">
            {isAvailable ? "Você está disponível para receber entregas" : "Você está indisponível"}
          </p>
        </div>
        <Button
          size="lg"
          onClick={toggleAvailability}
          disabled={loading}
          variant={isAvailable ? "destructive" : "default"}
          className="min-w-[140px]"
        >
          <Power className="h-5 w-5 mr-2" />
          {loading ? "Alterando..." : isAvailable ? "Ficar Offline" : "Ficar Online"}
        </Button>
      </div>
      {isAvailable && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            🟢 Você está visível para a empresa e pode receber pedidos
          </p>
        </div>
      )}
    </Card>
  );
};
