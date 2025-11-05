// FASE 5: Histórico de Pedidos para Cliente
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Package, MapPin, CreditCard, User, Clock } from "lucide-react";

interface OrderHistoryProps {
  clientId: string;
}

export const OrderHistory = ({ clientId }: OrderHistoryProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    setupRealtime();
  }, [clientId, statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          drivers(name, phone),
          order_items(*)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        if (statusFilter === "em_andamento") {
          query = query.in("status", ["PENDENTE", "ACEITO", "EM_PREPARO", "A_CAMINHO", "NA_PORTA"]);
        } else if (statusFilter === "concluido") {
          query = query.eq("status", "ENTREGUE");
        } else if (statusFilter === "cancelado") {
          query = query.eq("status", "CANCELADO");
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("client_orders_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `client_id=eq.${clientId}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      PENDENTE: "bg-yellow-500",
      ACEITO: "bg-blue-500",
      EM_PREPARO: "bg-purple-500",
      A_CAMINHO: "bg-indigo-500",
      NA_PORTA: "bg-orange-500",
      ENTREGUE: "bg-green-500",
      CANCELADO: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: any = {
      PENDENTE: "Aguardando",
      ACEITO: "Aceito",
      EM_PREPARO: "Em Preparo",
      A_CAMINHO: "A Caminho",
      NA_PORTA: "Chegou",
      ENTREGUE: "Entregue",
      CANCELADO: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusTimeline = (order: any) => {
    const timeline = [
      { label: "Pedido Criado", time: order.created_at, active: true },
      { label: "Aceito", time: order.accepted_at, active: !!order.accepted_at },
      { label: "Em Preparo", time: order.preparing_at, active: !!order.preparing_at },
      { label: "A Caminho", time: order.on_way_at, active: !!order.on_way_at },
      { label: "Na Porta", time: order.at_door_at, active: !!order.at_door_at },
      { label: "Entregue", time: order.delivered_at, active: !!order.delivered_at },
    ];

    if (order.status === "CANCELADO") {
      return [
        { label: "Pedido Criado", time: order.created_at, active: true },
        { label: "Cancelado", time: order.updated_at, active: true },
      ];
    }

    return timeline.filter(item => item.active);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Label>Filtrar por:</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluido">Concluídos</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando pedidos...
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Pedido #{order.id.slice(0, 8)}
                  </CardTitle>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("pt-BR")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{order.order_items?.length || 0} itens</span>
                  </div>
                  <div className="font-bold text-lg">
                    R$ {parseFloat(order.total).toFixed(2)}
                  </div>
                </div>

                {order.drivers && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Motorista: {order.drivers.name}</span>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrder(order)}
                  className="w-full"
                >
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Timeline */}
              <div>
                <h4 className="font-semibold mb-3">Acompanhamento</h4>
                <div className="space-y-3">
                  {getStatusTimeline(selectedOrder).map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${item.active ? 'bg-primary' : 'bg-muted'}`} />
                        {index < getStatusTimeline(selectedOrder).length - 1 && (
                          <div className="w-0.5 h-8 bg-muted" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="font-medium">{item.label}</p>
                        {item.time && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.time).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço de Entrega
                </h4>
                <p className="text-sm">
                  {selectedOrder.address?.street}, {selectedOrder.address?.number}
                  {selectedOrder.address?.complement && ` - ${selectedOrder.address.complement}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.address?.neighborhood} - {selectedOrder.address?.city}/{selectedOrder.address?.state}
                </p>
                {selectedOrder.address?.zipCode && (
                  <p className="text-sm text-muted-foreground">
                    CEP: {selectedOrder.address.zipCode}
                  </p>
                )}
              </div>

              {/* Itens */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Itens do Pedido
                </h4>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm py-2 border-b">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">
                        R$ {(item.quantity * parseFloat(item.unit_price)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2">
                    <span>Total:</span>
                    <span>R$ {parseFloat(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pagamento
                </h4>
                <p className="text-sm">Forma: {selectedOrder.payment_method}</p>
                {selectedOrder.change_for && (
                  <p className="text-sm">Troco para: R$ {parseFloat(selectedOrder.change_for).toFixed(2)}</p>
                )}
                <Badge variant={selectedOrder.payment_status === "PAID" ? "default" : "secondary"} className="mt-2">
                  {selectedOrder.payment_status === "PAID" ? "Pago" : "Pendente"}
                </Badge>
              </div>

              {/* Motorista */}
              {selectedOrder.drivers && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Motorista
                  </h4>
                  <p className="text-sm">{selectedOrder.drivers.name}</p>
                  {selectedOrder.drivers.phone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.drivers.phone}</p>
                  )}
                </div>
              )}

              {/* Motivo de Cancelamento */}
              {selectedOrder.status === "CANCELADO" && selectedOrder.cancel_reason && (
                <div>
                  <h4 className="font-semibold mb-2">Motivo do Cancelamento</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.cancel_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
