// FASE 4: Dashboard de Clientes para Empresa
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Search, ShoppingBag, Phone, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ClientsListProps {
  tenantId: string;
}

export const ClientsList = ({ tenantId }: ClientsListProps) => {
  const [clients, setClients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [tenantId]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      // Buscar clientes que fizeram pedidos neste tenant
      const { data, error } = await supabase
        .from("orders")
        .select(`
          client_id,
          clients(id, full_name, email, phone, cpf)
        `)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Agrupar por cliente e contar pedidos
      const clientsMap = new Map();
      data?.forEach((order: any) => {
        if (order.clients) {
          const clientId = order.client_id;
          if (!clientsMap.has(clientId)) {
            clientsMap.set(clientId, {
              ...order.clients,
              totalOrders: 0,
            });
          }
          clientsMap.get(clientId).totalOrders += 1;
        }
      });

      setClients(Array.from(clientsMap.values()));
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientOrders = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .eq("client_id", clientId)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClientOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar pedidos do cliente:", error);
    }
  };

  const openClientDetails = async (client: any) => {
    setSelectedClient(client);
    await fetchClientOrders(client.id);
  };

  const getClientStats = () => {
    if (clientOrders.length === 0) return { totalSpent: 0, avgTicket: 0, cancelRate: 0 };

    const totalSpent = clientOrders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const avgTicket = totalSpent / clientOrders.length;
    const canceledOrders = clientOrders.filter((o) => o.status === "CANCELADO").length;
    const cancelRate = (canceledOrders / clientOrders.length) * 100;

    return { totalSpent, avgTicket, cancelRate };
  };

  const filteredClients = clients.filter((client) =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Carregando clientes...
          </CardContent>
        </Card>
      ) : filteredClients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum cliente encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredClients.map((client) => (
            <Card key={client.id} className="cursor-pointer hover:shadow-lg transition-smooth">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {client.full_name || "Cliente"}
                  </CardTitle>
                  <Badge variant="secondary">
                    <ShoppingBag className="h-3 w-3 mr-1" />
                    {client.totalOrders} pedidos
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {client.email || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {client.phone || "N/A"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openClientDetails(client)}
                  className="w-full mt-2"
                >
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Detalhes do Cliente */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>

          {selectedClient && (
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Informações do Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <span className="font-medium">Nome: </span>
                      {selectedClient.full_name}
                    </div>
                    <div>
                      <span className="font-medium">Email: </span>
                      {selectedClient.email}
                    </div>
                    <div>
                      <span className="font-medium">Telefone: </span>
                      {selectedClient.phone}
                    </div>
                    {selectedClient.cpf && (
                      <div>
                        <span className="font-medium">CPF: </span>
                        {selectedClient.cpf}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Estatísticas */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        R$ {getClientStats().totalSpent.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Gasto</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        R$ {getClientStats().avgTicket.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground">Ticket Médio</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">
                        {getClientStats().cancelRate.toFixed(1)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Taxa Cancelamento</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Histórico de Pedidos */}
                <div>
                  <h4 className="font-semibold mb-3">Histórico de Pedidos</h4>
                  <div className="space-y-2">
                    {clientOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  #{order.id.slice(0, 8)}
                                </span>
                                <Badge className={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                R$ {parseFloat(order.total).toFixed(2)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {order.order_items?.length || 0} itens
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
