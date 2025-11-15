import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Phone, User, Package, DollarSign, CreditCard, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { isValidTransition, getStatusLabel } from "@/lib/orderStateMachine";
import { RouteMap } from "./RouteMap"; // Importar o componente RouteMap
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Importar componentes Select

interface OrderDetailsDialogProps {
  order: any;
  driverId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
  driverLocation: { lat: number; lng: number } | null; // Adicionar prop para localização do motorista
}

const PROBLEM_CATEGORIES = [
  "CLIENTE_AUSENTE",
  "ENDERECO_INCORRETO",
  "PROBLEMA_PAGAMENTO",
  "PRODUTO_DANIFICADO",
  "VEICULO_PROBLEMA",
  "OUTROS",
];

export const OrderDetailsDialog = ({ order, driverId, open, onOpenChange, onStatusUpdate, driverLocation }: OrderDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showFinishDeliveryDialog, setShowFinishDeliveryDialog] = useState(false);
  const [pendingReason, setPendingReason] = useState("");
  const [problemCategory, setProblemCategory] = useState<string>(""); // Novo estado para a categoria do problema

  if (!order) return null;

  const isAvailable = order.status === "ACEITO" && !order.assigned_driver; // Esta linha pode ser removida se não for mais usada
  const isAssignedToMe = order.assigned_driver === driverId;

  const acceptOrder = async () => {
    setLoading(true);
    try {
      // Verificar se ainda está disponível
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("assigned_driver")
        .eq("id", order.id)
        .single();

      if (currentOrder?.assigned_driver) {
        toast.error("Este pedido já foi aceito por outro entregador");
        onStatusUpdate();
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ 
          assigned_driver: driverId,
          status: "COLETADO", 
          collected_at: new Date().toISOString() 
        })
        .eq("id", order.id);

      if (error) throw error;

      toast.success("🎉 Pedido aceito! Você pode iniciar a entrega.");
      onStatusUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao aceitar pedido:", error);
      toast.error("Erro ao aceitar pedido");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    // Validar transição de estado
    if (!isValidTransition(order.status, newStatus)) {
      toast.error(`Não é possível mudar de ${getStatusLabel(order.status)} para ${getStatusLabel(newStatus)}`);
      return;
    }

    // Se for mudar para ENTREGUE, mostrar diálogo de finalização
    if (newStatus === "ENTREGUE") {
      setShowFinishDeliveryDialog(true);
      return;
    }
    // Se for mudar para PENDENTE, mostrar diálogo de motivo
    if (newStatus === "PENDENTE") {
      setShowPendingDialog(true);
      return;
    }

    await performStatusUpdate(newStatus);
  };

  const handleFinishDelivery = (success: boolean) => {
    if (success) {
      // Finalizar com sucesso
      if (order.payment_method === "CASH") {
        setShowPaymentDialog(true);
      } else {
        setShowConfirmDialog(true);
      }
    } else {
      // Finalizar pendente - mostrar diálogo de motivo
      setShowPendingDialog(true);
    }
    setShowFinishDeliveryDialog(false);
  };

  const performStatusUpdate = async (newStatus: string, paymentReceived?: boolean) => {
    setLoading(true);
    try {
      const updates: any = { status: newStatus };

      if (newStatus === "PREPARANDO") {
        updates.preparing_at = new Date().toISOString();
      } else if (newStatus === "COLETADO") {
        updates.collected_at = new Date().toISOString();
      } else if (newStatus === "A_CAMINHO") {
        updates.on_way_at = new Date().toISOString();
      } else if (newStatus === "CHEGOU") {
        updates.at_door_at = new Date().toISOString();
      } else if (newStatus === "ENTREGUE") {
        updates.delivered_at = new Date().toISOString();
        updates.payment_status = "PAID";
      } else if (newStatus === "PENDENTE") {
        updates.cancel_reason = pendingReason;
        updates.problem_category = problemCategory; // Salvar a categoria do problema
        updates.problem_description = pendingReason; // Usar pendingReason como descrição detalhada
      } else if (newStatus === "CANCELADO") {
        updates.cancel_reason = pendingReason;
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;
      
      const statusMessages: Record<string, string> = {
        PREPARANDO: "Pedido marcado como em preparação",
        COLETADO: "Pedido coletado pelo entregador",
        A_CAMINHO: "Entrega iniciada! Boa viagem!",
        CHEGOU: "Chegada registrada no local",
        ENTREGUE: "🎉 Entrega concluída! Valor creditado na carteira da empresa.",
        PENDENTE: "Entrega marcada como pendente",
        CANCELADO: "Pedido cancelado"
      };

      toast.success(statusMessages[newStatus] || "Status atualizado!");
      onStatusUpdate();
      onOpenChange(false);
      setShowConfirmDialog(false);
      setShowPaymentDialog(false);
      setShowPendingDialog(false);
      setShowFinishDeliveryDialog(false);
      setPendingReason("");
      setProblemCategory(""); // Limpar a categoria do problema
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setLoading(false);
    }
  };

  const handlePendingConfirm = async () => {
    if (!problemCategory || !pendingReason.trim()) { // Validar categoria e razão
      toast.error("Selecione uma categoria e informe o motivo da pendência");
      return;
    }
    await performStatusUpdate("PENDENTE");
  };

  const address = order.address || {};
  const paymentMethod = {
    CASH: "Dinheiro",
    CARD: "Cartão",
    PIX: "PIX",
  }[order.payment_method] || order.payment_method;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{order.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cliente */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{order.clients?.full_name || "Nome não disponível"}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <a href={`tel:${order.clients?.phone}`} className="hover:underline">
                    {order.clients?.phone || "Telefone não disponível"}
                  </a>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </h3>
              <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                <p>{address.street || "Rua não informada"}, {address.number || "s/n"}</p>
                {address.complement && <p>Complemento: {address.complement}</p>}
                <p>{address.neighborhood || "Bairro não informado"}</p>
                <p>{address.city || "Cidade não informada"} - {address.state || "Estado não informado"}</p>
                {address.zipCode && <p>CEP: {address.zipCode}</p>}
              </div>
              {/* Integrar RouteMap aqui */}
              {driverLocation && order.address && (
                <RouteMap address={order.address} driverLocation={driverLocation} />
              )}
            </div>

            {/* Itens */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Itens do Pedido
              </h3>
              <div className="space-y-2">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 bg-muted rounded">
                    <span>{item.quantity}x {item.name}</span>
                    <span className="font-medium">R$ {parseFloat(item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagamento */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pagamento
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Método:</span>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3 w-3" />
                    <span className="font-medium">{paymentMethod}</span>
                  </div>
                </div>
                {order.change_for && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Troco para:</span>
                    <span className="font-medium">R$ {parseFloat(order.change_for).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-semibold">Total:</span>
                  <span className="text-lg font-bold text-primary">R$ {parseFloat(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Status Atual
              </h3>
              <Badge className="text-sm">{getStatusLabel(order.status)}</Badge>
            </div>

            {/* Ações */}
            <div className="space-y-2">
              {isAssignedToMe && order.status === "PRONTO" && (
                <Button 
                  onClick={() => updateOrderStatus("COLETADO")} 
                  disabled={loading}
                  className="w-full"
                  variant="default"
                  size="lg"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Coletar Pedido
                </Button>
              )}

              {isAssignedToMe && order.status === "COLETADO" && (
                <Button 
                  onClick={() => updateOrderStatus("A_CAMINHO")} 
                  disabled={loading}
                  className="w-full"
                  variant="default"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Entrega a Caminho
                </Button>
              )}

              {isAssignedToMe && order.status === "A_CAMINHO" && (
                <Button 
                  onClick={() => updateOrderStatus("CHEGOU")} 
                  disabled={loading}
                  className="w-full"
                  variant="default"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Cheguei no Local
                </Button>
              )}

              {isAssignedToMe && order.status === "CHEGOU" && (
                <Button 
                  onClick={() => updateOrderStatus("ENTREGUE")} 
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Finalizar Entrega
                </Button>
              )}

              {isAssignedToMe && (order.status === "A_CAMINHO" || order.status === "CHEGOU") && (
                <Button 
                  onClick={() => updateOrderStatus("PENDENTE")}
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Reportar Problema
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação - Pagamento Plataforma */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Entrega?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Você confirma que o pedido foi entregue ao cliente com sucesso?</p>
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg mt-3">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Ao confirmar:
                </p>
                <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1 list-disc list-inside">
                  <li>O status será marcado como ENTREGUE</li>
                  <li>R$ {parseFloat(order.total).toFixed(2)} será creditado na carteira da empresa</li>
                  <li>O cliente será notificado</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => performStatusUpdate("ENTREGUE", true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Confirmando..." : "Sim, Confirmar Entrega"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Finalização de Entrega */}
      <AlertDialog open={showFinishDeliveryDialog} onOpenChange={setShowFinishDeliveryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Entrega</AlertDialogTitle>
            <AlertDialogDescription>
              Como deseja finalizar esta entrega?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-3">
            <Button
              onClick={() => handleFinishDelivery(true)}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar com Sucesso
            </Button>
            <Button
              onClick={() => handleFinishDelivery(false)}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
              variant="outline"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Finalizar Pendente
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação - Pagamento em Dinheiro */}
      <AlertDialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              O pagamento será em dinheiro. O cliente pagou corretamente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogAction
              onClick={() => performStatusUpdate("ENTREGUE", true)}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizada (Pagamento OK)
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => {
                setShowPaymentDialog(false);
                setShowPendingDialog(true);
              }}
              disabled={loading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Pendente
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Motivo de Pendência */}
      <AlertDialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reportar Problema na Entrega</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a categoria do problema e forneça uma descrição detalhada. Esta informação será registrada e visível para a empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4 space-y-4">
            <div>
              <Label htmlFor="problem-category">Categoria do Problema *</Label>
              <Select value={problemCategory} onValueChange={setProblemCategory}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {PROBLEM_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pending-reason">Descrição Detalhada do Problema *</Label>
              <Textarea
                id="pending-reason"
                placeholder="Ex: Cliente não estava no endereço, cliente não tinha o valor exato, endereço incorreto, cliente solicitou reagendamento..."
                value={pendingReason}
                onChange={(e) => setPendingReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Seja específico sobre o motivo da pendência para ajudar a empresa a entender a situação.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowPendingDialog(false);
                setPendingReason("");
                setProblemCategory("");
              }}
              disabled={loading}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePendingConfirm}
              disabled={loading || !problemCategory || !pendingReason.trim()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Reportando..." : "Confirmar Problema"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};