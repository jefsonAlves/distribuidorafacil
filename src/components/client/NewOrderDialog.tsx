import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Minus } from "lucide-react";

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  tenantId?: string; // FASE 6: Opcional - cliente pode escolher empresa
  onSuccess: () => void;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export const NewOrderDialog = ({ open, onOpenChange, clientId, tenantId, onSuccess }: NewOrderDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // FASE 6: Multi-tenant - lista de empresas
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState(tenantId || "");
  
  const [address, setAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [changeFor, setChangeFor] = useState("");

  useEffect(() => {
    if (open) {
      fetchTenants();
      fetchClientAddress();
    }
  }, [open]);

  useEffect(() => {
    if (selectedTenant) {
      fetchProducts();
    }
  }, [selectedTenant]);

  // FASE 6: Buscar empresas ativas
  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("status", "ACTIVE")
        .order("name");

      if (error) throw error;
      setTenants(data || []);
      
      // Se tenantId foi passado, usar ele
      if (tenantId) {
        setSelectedTenant(tenantId);
      } else if (data && data.length > 0) {
        // Senão, selecionar primeira empresa
        setSelectedTenant(data[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas:", error);
      toast.error("Erro ao carregar empresas");
    }
  };

  const fetchProducts = async () => {
    if (!selectedTenant) return;
    
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", selectedTenant)
        .eq("active", true)
        .gt("stock", 0);

      if (error) throw error;
      setProducts(data || []);
      
      // Limpar carrinho ao trocar de empresa
      setCart([]);
    } catch (error: any) {
      console.error("Erro ao buscar produtos:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const fetchClientAddress = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("address")
        .eq("id", clientId)
        .single();

      if (error) throw error;
      if (data?.address && typeof data.address === 'object') {
        setAddress(data.address as any);
      }
    } catch (error: any) {
      console.error("Erro ao buscar endereço:", error);
    }
  };

  const addToCart = (product: any) => {
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: 1,
      }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.productId === productId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedTenant) {
      toast.error("Selecione uma empresa");
      return;
    }
    
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho");
      return;
    }

    if (!paymentMethod) {
      toast.error("Selecione uma forma de pagamento");
      return;
    }

    setLoading(true);
    try {
      const total = calculateTotal();

      // Criar pedido
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          tenant_id: selectedTenant,
          client_id: clientId,
          total,
          payment_method: paymentMethod as any,
          change_for: paymentMethod === "CASH" && changeFor ? parseFloat(changeFor) : null,
          address: address as any,
          status: "PENDENTE" as any,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens do pedido
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Pedido criado com sucesso!");
      onSuccess();
      onOpenChange(false);
      setCart([]);
      setPaymentMethod("");
      setChangeFor("");
    } catch (error: any) {
      console.error("Erro ao criar pedido:", error);
      toast.error("Erro ao criar pedido: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const selectedTenantName = tenants.find(t => t.id === selectedTenant)?.name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
          {selectedTenantName && (
            <p className="text-sm text-muted-foreground">Empresa: <span className="font-semibold text-foreground">{selectedTenantName}</span></p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* FASE 6: Seleção de Empresa */}
          {!tenantId && tenants.length > 0 && (
            <div>
              <Label>Selecione a Empresa *</Label>
              <Select value={selectedTenant} onValueChange={setSelectedTenant} required>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Produtos */}
          <div>
            <Label>Selecione os Produtos</Label>
            {!selectedTenant && <p className="text-sm text-muted-foreground mt-2">Selecione uma empresa primeiro</p>}
            {selectedTenant && products.length === 0 && <p className="text-sm text-muted-foreground mt-2">Nenhum produto disponível</p>}
            {selectedTenant && products.length > 0 && (
              <div className="grid gap-2 mt-2">
              {products.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">R$ {parseFloat(product.price).toFixed(2)}</p>
                  </div>
                  <Button type="button" size="sm" onClick={() => addToCart(product)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          {cart.length > 0 && (
            <div>
              <Label>Carrinho</Label>
              <div className="space-y-2 mt-2">
                {cart.map(item => (
                  <div key={item.productId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm">R$ {item.price.toFixed(2)} cada</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => updateQuantity(item.productId, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button type="button" size="sm" variant="outline" onClick={() => updateQuantity(item.productId, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => removeFromCart(item.productId)}>
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="text-right font-bold text-lg pt-2 border-t">
                  Total: R$ {calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Endereço */}
          <div className="space-y-3">
            <Label>Endereço de Entrega</Label>
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Input
                    placeholder="Rua"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    required
                  />
                </div>
                <Input
                  placeholder="Número"
                  value={address.number}
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                  required
                />
              </div>
              <Input
                placeholder="Complemento (opcional)"
                value={address.complement}
                onChange={(e) => setAddress({ ...address, complement: e.target.value })}
              />
              <Input
                placeholder="Bairro"
                value={address.neighborhood}
                onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Cidade"
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  required
                />
                <Input
                  placeholder="Estado"
                  value={address.state}
                  onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  required
                  maxLength={2}
                />
              </div>
              <Input
                placeholder="CEP"
                value={address.zipCode}
                onChange={async (e) => {
                  const cep = e.target.value;
                  setAddress({ ...address, zipCode: cep });
                  
                  if (cep.replace(/\D/g, '').length === 8) {
                    const { fetchAddressFromCEP } = await import("@/lib/geocoding");
                    const data = await fetchAddressFromCEP(cep);
                    if (data) {
                      setAddress({
                        ...address,
                        zipCode: cep,
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf,
                      });
                      toast.success("Endereço preenchido automaticamente!");
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Pagamento */}
          <div className="space-y-3">
            <Label>Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Dinheiro</SelectItem>
                <SelectItem value="CARD">Cartão</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
              </SelectContent>
            </Select>
            {paymentMethod === "CASH" && (
              <div>
                <Label>Troco para (opcional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="R$ 0,00"
                  value={changeFor}
                  onChange={(e) => setChangeFor(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || cart.length === 0} className="flex-1">
              {loading ? "Criando..." : "Finalizar Pedido"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
