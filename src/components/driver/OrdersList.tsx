import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Phone, User, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusLabel } from "@/lib/orderStateMachine"; // Importar getStatusLabel

interface OrdersListProps {
  driverId: string;
}

export const OrdersList = ({ driverId }: OrdersListProps) => {
  const [availableOrders, setAvailableOrders] = useState<any[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("available");
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null); // Novo estado para a localização do motorista

  // Efeito para obter a localização atual do motorista
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Erro ao obter a localização do motorista:", error);
        toast.error("Não foi possível obter sua localização. Verifique as permissões do navegador.");
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      // Buscar pedidos disponíveis (status PRONTO e sem driver atribuído)
      const { data: fetchedAvailableOrders, error: error1 } = await supabase
        .from("orders")
        .select(`
          *,
          clients (full_name, phone, tenant_id),
          order_items (id, name, quantity, unit_price)
        `)
        .eq("status", "PRONTO")
        .is("assigned_driver", null)
        .order("created_at", { ascending: true });

      // Buscar pedidos em andamento (atribuídos a este driver com status COLETADO, A_CAMINHO, CHEGOU, PENDENTE)
      const { data: fetchedInProgressOrders, error: error2 } = await supabase
        .from("orders")
        .select(`
          *,
          clients (full_name, phone, tenant_id),
          order_items (id, name, quantity, unit_price)
        `)
        .eq("assigned_driver", driverId)
        .in("status", ["COLETADO", "A_CAMINHO", "CHEGOU", "PENDENTE"])
        .order("created_at", { ascending: false });

      if (error1 || error2) throw error1 || error2;
      
      setAvailableOrders(fetchedAvailableOrders || []);
      setInProgressOrders(fetchedInProgressOrders || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchOrdersWithDebounce = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        fetchOrders();
      }, 200);
    };

    fetchOrders();

    const channel = supabase
      .channel(`driver-orders-realtime-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          const newOrder = payload.new;
          const oldOrder = payload.old;

          if (!newOrder && !oldOrder) return;

          // Re-fetch se:
          // 1. Um pedido se torna PRONTO e não atribuído (disponível)
          // 2. Um pedido é atribuído a este driver
          // 3. O status de um pedido atribuído a este driver muda (e não foi ENTREGUE/CANCELADO)
          const isNowAvailable = newOrder?.status === 'PRONTO' && !newOrder?.assigned_driver;
          const isNowAssignedToMe = newOrder?.assigned_driver === driverId && newOrder?.status !== 'ENTREGUE' && newOrder?.status !== 'CANCELADO';
          const wasAssignedToMeAndStatusChanged = oldOrder?.assigned_driver === driverId && newOrder?.status !== oldOrder?.status && newOrder?.status !== 'ENTREGUE' && newOrder?.status !== 'CANCELADO';
          const wasAssignedToMeAndNowNot = oldOrder?.assigned_driver === driverId && newOrder?.assigned_driver !== driverId;
          
          if (isNowAvailable || isNowAssignedToMe || wasAssignedToMeAndStatusChanged || wasAssignedToMeAndNowNot) {
            fetchOrdersWithDebounce();
          }
        }
      )
      .subscribe();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [driverId, fetchOrders]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      SOLICITADO: { label: "Solicitado", variant: "outline" },
      ACEITO: { label: "Aceito", variant: "secondary" },
      PREPARANDO: { label: "Preparando", variant: "default" },
      PRONTO: { label: "Pronto para Coleta", variant: "default" },
      COLETADO: { label: "Coletado", variant: "default" },
      A_CAMINHO: { label: "A Caminho", variant: "default" },
      CHEGOU: { label: "Chegou no Local", variant: "default" },
      ENTREGUE: { label: "Entregue", variant: "success" }, // Supondo que 'success' seja uma variante válida ou usar 'default'
      PENDENTE: { label: "Pendente", variant: "destructive" },
      CANCELADO: { label: "Cancelado", variant: "destructive" },
    };
    const config = statusMap[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleAcceptOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // Verificar se ainda está disponível
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("assigned_driver")
        .eq("id", orderId)
        .single();

      if (currentOrder?.assigned_driver) {
        toast.error("Este pedido já foi aceito por outro entregador");
        fetchOrders(); // Re-fetch para atualizar a lista
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({
          assigned_driver: driverId,
          status: "COLETADO", // Altera o status para COLETADO quando o entregador aceita
          collected_at: new Date().toISOString() // Adiciona o timestamp de coleta
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("🎉 Pedido aceito! Você pode iniciar a entrega.");
      fetchOrders();
    } catch (error: any) {
      console.error("Erro ao aceitar pedido:", error);
      toast.error("Erro ao aceitar pedido");
    } finally {
      setLoading(false);
    }
  };

  const renderOrderCard = (order: any, isAvailableTab: boolean) => (
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
            <span className="text-xs">{order.address?.street}, {order.address?.number} - {order.address?.neighborhood}</span>
          </div>
        </div>

        <div className="pt-3 border-t flex gap-2">
          <Button onClick={() => handleViewDetails(order)} className="flex-grow" variant="outline">
            Ver Detalhes Completos
          </Button>
          {isAvailableTab && (
            <Button onClick={() => handleAcceptOrder(order.id)} disabled={loading} className="flex-grow">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aceitar Entrega
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  const noOrdersMessage = (
    <Card className="p-6">
      <div className="text-center py-8 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum pedido disponível no momento.</p>
      </div>
    </Card>
  );

  return (
    <>
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="available">Disponíveis ({availableOrders.length})</TabsTrigger>
            <TabsTrigger value="inProgress">Em Andamento ({inProgressOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="available" className="mt-4">
            <h2 className="text-xl font-bold mb-4">Pedidos Disponíveis para Coleta</h2>
            <div className="space-y-4">
              {availableOrders.length > 0 ? (
                availableOrders.map((order) => renderOrderCard(order, true))
              ) : (
                noOrdersMessage
              )}
            </div>
          </TabsContent>
          <TabsContent value="inProgress" className="mt-4">
            <h2 className="text-xl font-bold mb-4">Minhas Entregas em Andamento</h2>
            <div className="space-y-4">
              {inProgressOrders.length > 0 ? (
                inProgressOrders.map((order) => renderOrderCard(order, false))
              ) : (
                <Card className="p-6">
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma entrega em andamento no momento.</p>
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <OrderDetailsDialog
        order={selectedOrder}
        driverId={driverId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStatusUpdate={fetchOrders}
        driverLocation={driverLocation} // Passar a localização do motorista
      />
    </>
  );
};
