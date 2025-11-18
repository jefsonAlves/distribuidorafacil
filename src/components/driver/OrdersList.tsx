import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, MapPin, Phone, User, DollarSign, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { OrderDetailsDialog } from "./OrderDetailsDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusLabel } from "@/lib/orderStateMachine";
import { useDriverOrdersRealtime } from "@/hooks/useRealtimeUpdates";

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
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverTenantId, setDriverTenantId] = useState<string | null>(null);
  const prevCountRef = useRef(0);

  // Buscar tenant_id do motorista
  useEffect(() => {
    const fetchDriverTenant = async () => {
      const { data } = await supabase
        .from("drivers")
        .select("tenant_id")
        .eq("id", driverId)
        .single();
      
      if (data) {
        setDriverTenantId(data.tenant_id);
        console.log("🏢 Tenant do motorista:", data.tenant_id);
      }
    };
    
    fetchDriverTenant();
  }, [driverId]);

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
    if (!driverTenantId) {
      setAvailableOrders([]);
      setInProgressOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Primeiro verificar se o motorista tem algum pedido em andamento
      const { data: inProgressCheck, error: checkError } = await supabase
        .from("orders")
        .select("id")
        .eq("assigned_driver", driverId)
        .in("status", ["ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA", "PENDENTE"])
        .limit(1);

      if (checkError) throw checkError;

      const hasOrderInProgress = (inProgressCheck?.length || 0) > 0;

      // Buscar pedidos disponíveis (status ACEITO pela empresa e sem driver atribuído)
      // Só mostrar se o motorista não tiver pedido em andamento
      let fetchedAvailableOrders: any[] = [];
      if (!hasOrderInProgress) {
        const { data, error: error1 } = await supabase
          .from("orders")
          .select(`
            *,
            clients (full_name, phone, tenant_id),
            order_items (id, name, quantity, unit_price)
          `)
          .eq("status", "ACEITO")
          .is("assigned_driver", null)
          .eq("tenant_id", driverTenantId)
          .order("created_at", { ascending: true });

        if (error1) throw error1;
        fetchedAvailableOrders = data || [];
        
        console.log("📦 Pedidos disponíveis encontrados:", fetchedAvailableOrders.length);
      }

      // Buscar pedidos em andamento (atribuídos a este driver)
      const { data: fetchedInProgressOrders, error: error2 } = await supabase
        .from("orders")
        .select(`
          *,
          clients (full_name, phone, tenant_id),
          order_items (id, name, quantity, unit_price)
        `)
        .eq("assigned_driver", driverId)
        .in("status", ["ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA", "PENDENTE"])
        .order("created_at", { ascending: false });

      if (error2) throw error2;
      
      console.log("🚗 Driver ID:", driverId);
      console.log("🚚 Pedidos em andamento:", fetchedInProgressOrders?.length || 0);
      
      // Verificar se motorista tem sessão ativa
      const { data: session } = await supabase
        .from("driver_sessions")
        .select("id")
        .eq("driver_id", driverId)
        .is("ended_at", null)
        .maybeSingle();
      
      console.log("📱 Sessão ativa:", !!session);
      
      setAvailableOrders(fetchedAvailableOrders);
      setInProgressOrders(fetchedInProgressOrders || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  }, [driverId, driverTenantId]);

  // Notificar quando novos pedidos aparecerem
  useEffect(() => {
    if (availableOrders.length > prevCountRef.current && prevCountRef.current > 0) {
      toast.success("Novo pedido disponível!", {
        description: "Um novo pedido está aguardando você!",
        duration: 5000,
      });
    }
    prevCountRef.current = availableOrders.length;
  }, [availableOrders.length]);

  useEffect(() => {
    if (!driverTenantId) return;
    fetchOrders();
  }, [driverTenantId, fetchOrders]);

  useDriverOrdersRealtime(driverTenantId, fetchOrders, !!driverTenantId);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDENTE: { variant: "outline" },
      ACEITO: { variant: "secondary" },
      EM_PREPARO: { variant: "default" },
      A_CAMINHO: { variant: "default" },
      NA_PORTA: { variant: "default" },
      ENTREGUE: { variant: "default" },
      CANCELADO: { variant: "destructive" },
    };
    const config = statusMap[status] || { variant: "outline" };
    return <Badge variant={config.variant}>{getStatusLabel(status)}</Badge>;
  };

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleAcceptOrder = async (orderId: string) => {
    setLoading(true);
    try {
      // Verificar se motorista já tem pedido em andamento
      const { data: existingOrder } = await supabase
        .from("orders")
        .select("id")
        .eq("assigned_driver", driverId)
        .in("status", ["ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA", "PENDENTE"])
        .limit(1)
        .maybeSingle();

      if (existingOrder) {
        toast.error("Você já tem uma entrega em andamento. Finalize ou cancele antes de aceitar outro pedido.");
        fetchOrders();
        return;
      }

      // Verificar se ainda está disponível
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("assigned_driver, status")
        .eq("id", orderId)
        .single();

      if (currentOrder?.assigned_driver) {
        toast.error("Este pedido já foi aceito por outro entregador");
        fetchOrders(); // Re-fetch para atualizar a lista
        return;
      }

      if (currentOrder?.status !== "ACEITO") {
        toast.error("Este pedido não está mais disponível para aceitação");
        fetchOrders();
        return;
      }

      // Atualizar pedido: atribuir motorista e mudar status para A_CAMINHO automaticamente
      const { error } = await supabase
        .from("orders")
        .update({
          assigned_driver: driverId,
          status: "A_CAMINHO", // Muda automaticamente para "Em Rota de Entrega"
          on_way_at: new Date().toISOString() // Timestamp de início da entrega
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("🎉 Pedido aceito! Você está em rota de entrega.");
      fetchOrders();
    } catch (error: any) {
      console.error("Erro ao aceitar pedido:", error);
      toast.error("Erro ao aceitar pedido");
    } finally {
      setLoading(false);
    }
  };

  // Verificar se pedido é novo (< 2 minutos)
  const isNewOrder = (createdAt: string) => {
    const orderTime = new Date(createdAt).getTime();
    const now = Date.now();
    return (now - orderTime) < 2 * 60 * 1000;
  };

  const renderOrderCard = (order: any, isAvailableTab: boolean) => (
    <Card key={order.id} className="p-4 hover:shadow-lg transition-shadow">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">#{order.id.slice(0, 8)}</span>
              {getStatusBadge(order.status)}
              {isNewOrder(order.created_at) && (
                <Badge className="animate-pulse bg-green-500 ml-2">Novo!</Badge>
              )}
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
