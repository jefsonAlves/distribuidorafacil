// FASE 2: Gestão de Pedidos para Empresa
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Package, User, MapPin, CreditCard, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OrdersManagementProps {
  tenantId: string;
}

export const OrdersManagement = ({ tenantId }: OrdersManagementProps) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelReason, setCancelReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
  }, [tenantId, statusFilter]);

  useEffect(() => {
    const cleanup = setupRealtime();
    return cleanup;
  }, [tenantId]);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from("orders")
        .select(`
          *,
          clients(full_name, phone),
          drivers(name),
          order_items(*)
        `)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao carregar pedidos");
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("status", "ACTIVE");

      if (error) throw error;
      setDrivers(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar motoristas:", error);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel("orders_management_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload: any) => {
          // Atualizar automaticamente quando houver mudanças
          // Debounce para evitar múltiplas atualizações rápidas
          setTimeout(() => {
            fetchOrders();
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const assignDriver = async () => {
    if (!selectedOrder || !selectedDriver) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          assigned_driver: selectedDriver,
          status: "ACEITO",
          accepted_at: new Date().toISOString() // Adiciona o timestamp de aceitação
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;
      
      toast.success("Motorista atribuído com sucesso!");
      setSelectedOrder(null);
      setSelectedDriver("");
      fetchOrders();
    } catch (error: any) {
      console.error("Erro ao atribuir motorista:", error);
      toast.error("Erro ao atribuir motorista");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "ACEITO") updateData.accepted_at = new Date().toISOString();
      if (newStatus === "PREPARANDO") updateData.preparing_at = new Date().toISOString();
      if (newStatus === "PRONTO") updateData.ready_at = new Date().toISOString();
      if (newStatus === "COLETADO") updateData.collected_at = new Date().toISOString();
      if (newStatus === "A_CAMINHO") updateData.on_way_at = new Date().toISOString();
      if (newStatus === "CHEGOU") updateData.at_door_at = new Date().toISOString();
      if (newStatus === "ENTREGUE") {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = "PAID";
      } else if (newStatus === "PENDENTE") {
        // Pendente é tratado no dialog do entregador, mas a empresa pode ter que mudar para esse status se reportar problema
        updateData.is_pending = true;
      } else if (newStatus === "CANCELADO") {
        // Cancelamento é tratado em handleCancelClick
        updateData.is_cancelled = true;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Status atualizado!");
      fetchOrders();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const handleCancelClick = (order: any) => {
    setOrderToCancel(order);
    setCancelReason("");
    setShowCancelDialog(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) {
      toast.error("Informe o motivo do cancelamento");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "CANCELADO",
          cancel_reason: cancelReason 
        })
        .eq("id", orderToCancel.id);

      if (error) throw error;
      
      toast.success("Pedido cancelado com sucesso");
      setShowCancelDialog(false);
      setOrderToCancel(null);
      setCancelReason("");
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error("Erro ao cancelar pedido:", error);
      toast.error("Erro ao cancelar pedido");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      SOLICITADO: "bg-gray-400",
      ACEITO: "bg-blue-500",
      PREPARANDO: "bg-purple-500",
      PRONTO: "bg-indigo-500",
      COLETADO: "bg-yellow-500",
      A_CAMINHO: "bg-teal-500",
      CHEGOU: "bg-orange-500",
      ENTREGUE: "bg-green-500",
      PENDENTE: "bg-orange-600",
      CANCELADO: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="SOLICITADO">Solicitado</SelectItem>
            <SelectItem value="ACEITO">Aceito</SelectItem>
            <SelectItem value="PREPARANDO">Preparando</SelectItem>
            <SelectItem value="PRONTO">Pronto</SelectItem>
            <SelectItem value="COLETADO">Coletado</SelectItem>
            <SelectItem value="A_CAMINHO">A Caminho</SelectItem>
            <SelectItem value="CHEGOU">Chegou no Local</SelectItem>
            <SelectItem value="ENTREGUE">Entregue</SelectItem>
            <SelectItem value="PENDENTE">Pendente</SelectItem>
            <SelectItem value="CANCELADO">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <Card key={order.id} className="cursor-pointer hover:shadow-lg transition-smooth">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pedido #{order.id.slice(0, 8)}</CardTitle>
                <Badge className={getStatusColor(order.status)}>
                  {order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.clients?.full_name || "Cliente"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{order.payment_method}</span>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs">
                    {order.address?.street}, {order.address?.number} - {order.address?.neighborhood}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedOrder(order)}
                >
                  Ver Detalhes
                </Button>
                
                {order.status === "SOLICITADO" && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(order.id, "ACEITO")}
                    >
                      Aceitar Pedido
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleCancelClick(order)}
                    >
                      Cancelar
                    </Button>
                  </>
                )}

                {order.status === "ACEITO" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(order.id, "PREPARANDO")}
                  >
                    Marcar como Preparando
                  </Button>
                )}

                {order.status === "PREPARANDO" && (
                  <Button
                    size="sm"
                    onClick={() => updateStatus(order.id, "PRONTO")}
                  >
                    Marcar como Pronto para Coleta
                  </Button>
                )}

                {order.status === "PRONTO" && !order.assigned_driver && (
                  <Badge variant="outline" className="text-xs">
                    Aguardando entregador aceitar
                  </Badge>
                )}
                {order.status === "PRONTO" && order.assigned_driver && (
                  <Badge variant="outline" className="text-xs">
                    Entregador Atribuído
                  </Badge>
                )}

                {order.status === "PENDENTE" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(order.id, "ACEITO")}
                  >
                    Resolver Problema (Aceitar novamente)
                  </Button>
                )}

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de Detalhes/Atribuição */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="assign">Atribuir/Cancelar</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Cliente</h4>
                  <p>{selectedOrder.clients?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.clients?.phone}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Endereço</h4>
                  <p className="text-sm">
                    {selectedOrder.address?.street}, {selectedOrder.address?.number}
                    {selectedOrder.address?.complement && ` - ${selectedOrder.address.complement}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.address?.neighborhood} - {selectedOrder.address?.city}/{selectedOrder.address?.state}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Itens</h4>
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                    <span>Total:</span>
                    <span>R$ {parseFloat(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {selectedOrder.drivers && (
                  <div>
                    <h4 className="font-semibold mb-2">Motorista</h4>
                    <p>{selectedOrder.drivers.name}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assign" className="space-y-4">
                {selectedOrder.status === "ACEITO" && !selectedOrder.assigned_driver && (
                  <div className="space-y-3">
                    <Label>Selecionar Motorista</Label>
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um motorista" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.name} ({driver.vehicle || "Sem veículo"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={assignDriver} disabled={loading || !selectedDriver} className="w-full">
                      {loading ? "Atribuindo..." : "Atribuir Motorista"}
                    </Button>
                  </div>
                )}

                {selectedOrder.status !== "CANCELADO" && selectedOrder.status !== "ENTREGUE" && (
                  <div className="space-y-3">
                    <Label>Cancelar Pedido</Label>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleCancelClick(selectedOrder)} 
                      className="w-full"
                    >
                      Cancelar Este Pedido
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Cancelamento */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o pedido #{orderToCancel?.id.slice(0, 8)}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label>Motivo do Cancelamento *</Label>
            <Textarea
              placeholder="Ex: Cliente solicitou cancelamento, produto indisponível..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelDialog(false);
              setOrderToCancel(null);
              setCancelReason("");
            }}>
              Não, voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelOrder}
              disabled={loading || !cancelReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Cancelando..." : "Sim, cancelar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
