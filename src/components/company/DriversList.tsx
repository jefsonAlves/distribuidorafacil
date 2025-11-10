import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { CreateDriverDialog } from "./CreateDriverDialog";

interface DriversListProps {
  tenantId: string;
}

export const DriversList = ({ tenantId }: DriversListProps) => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchDrivers();

    // Realtime subscription para status dos motoristas
    const channel = supabase
      .channel('drivers-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drivers',
          filter: `tenant_id=eq.${tenantId}`
        },
        () => {
          fetchDrivers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("name");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar motoristas:", error);
      toast.error("Erro ao carregar motoristas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando motoristas...</div>;
  }

  // Filtrar motoristas por status (ACTIVE, ONLINE, IN_SERVICE são considerados disponíveis)
  const activeDrivers = drivers.filter(d => 
    d.status === 'ACTIVE' || d.status === 'ONLINE' || d.status === 'IN_SERVICE'
  );
  const inactiveDrivers = drivers.filter(d => 
    d.status === 'INACTIVE' || (!d.status || (d.status !== 'ACTIVE' && d.status !== 'ONLINE' && d.status !== 'IN_SERVICE'))
  );

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Motoristas</h2>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Cadastrar Entregador
          </Button>
        </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Online ({activeDrivers.length})
          </h3>
          {activeDrivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum motorista online</p>
          ) : (
            <div className="grid gap-3">
              {activeDrivers.map((driver) => (
                <Card key={driver.id} className="p-4 border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{driver.name}</span>
                        <Badge variant="default" className="bg-green-500">Disponível</Badge>
                      </div>
                      {driver.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </div>
                      )}
                      {driver.vehicle && driver.plate && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Truck className="h-3 w-3" />
                          {driver.vehicle} - {driver.plate}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
            Offline ({inactiveDrivers.length})
          </h3>
          {inactiveDrivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os motoristas estão online</p>
          ) : (
            <div className="grid gap-3">
              {inactiveDrivers.map((driver) => (
                <Card key={driver.id} className="p-4 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{driver.name}</span>
                        <Badge variant="secondary">Indisponível</Badge>
                      </div>
                      {driver.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {driver.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>

    <CreateDriverDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      tenantId={tenantId}
      onSuccess={fetchDrivers}
    />
    </>
  );
};
