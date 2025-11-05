import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Phone, User, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { OrderDetailsDialog } from "./OrderDetailsDialog";

interface OrdersListProps {
  driverId: string;
}

export const OrdersList = ({ driverId }: OrdersListProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    fetchOrders();

    // Realtime para novos pedidos
    const channel = supabase
      .channel('driver-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `assigned_driver=eq.${driverId}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          clients (
            full_name,
            phone
          ),
          order_items (
            id,
            name,
            quantity,
            unit_price
          )
        `)
        .eq("assigned_driver", driverId)
        .in("status", ["ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      ACEITO: { label: "Aceito", variant: "secondary" },
      EM_PREPARO: { label: "Preparando", variant: "default" },
      A_CAMINHO: { label: "A Caminho", variant: "default" },
      NA_PORTA: { label: "Na Porta", variant: "default" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando pedidos...</div>;
  }

  if (orders.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum pedido atribuído no momento</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Pedidos Atribuídos</h2>
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold">
                      <DollarSign className="h-4 w-4" />
                      R$ {parseFloat(order.total).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.clients?.full_name || "Cliente"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.clients?.phone || "Sem telefone"}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-xs">Clique em "Ver Detalhes" para ver o endereço completo</span>
                  </div>
                </div>

                <div className="pt-3 border-t">
                  <Button onClick={() => handleViewDetails(order)} className="w-full">
                    Ver Detalhes Completos
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <OrderDetailsDialog
        order={selectedOrder}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusUpdate={fetchOrders}
      />
    </>
  );
};
