import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Phone, User, Package, DollarSign, CreditCard, Clock } from "lucide-react";

interface OrderDetailsDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: () => void;
}

export const OrderDetailsDialog = ({ order, open, onOpenChange, onStatusUpdate }: OrderDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const updateOrderStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      const updates: any = { status: newStatus };

      if (newStatus === "EM_PREPARO") {
        updates.preparing_at = new Date().toISOString();
      } else if (newStatus === "A_CAMINHO") {
        updates.on_way_at = new Date().toISOString();
      } else if (newStatus === "NA_PORTA") {
        updates.at_door_at = new Date().toISOString();
      } else if (newStatus === "ENTREGUE") {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", order.id);

      if (error) throw error;
      
      toast.success("Status atualizado com sucesso!");
      onStatusUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setLoading(false);
    }
  };

  const address = order.address || {};
  const paymentMethod = {
    DINHEIRO: "Dinheiro",
    CARTAO: "Cartão",
    PIX: "PIX",
  }[order.payment_method] || order.payment_method;

  return (
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
                <span className="text-lg font-bold">R$ {parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Status Atual
            </h3>
            <Badge className="text-sm">{order.status}</Badge>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            {order.status === "ACEITO" && (
              <Button 
                onClick={() => updateOrderStatus("EM_PREPARO")} 
                disabled={loading}
                className="w-full"
              >
                Marcar como Preparando
              </Button>
            )}
            {order.status === "EM_PREPARO" && (
              <Button 
                onClick={() => updateOrderStatus("A_CAMINHO")} 
                disabled={loading}
                className="w-full"
              >
                Iniciar Entrega
              </Button>
            )}
            {order.status === "A_CAMINHO" && (
              <Button 
                onClick={() => updateOrderStatus("NA_PORTA")} 
                disabled={loading}
                className="w-full"
              >
                Cheguei no Local
              </Button>
            )}
            {order.status === "NA_PORTA" && (
              <Button 
                onClick={() => updateOrderStatus("ENTREGUE")} 
                disabled={loading}
                className="w-full"
              >
                Confirmar Entrega
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
