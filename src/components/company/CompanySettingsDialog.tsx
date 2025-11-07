import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Palette, Clock, CreditCard, Truck, Loader2 } from "lucide-react";

interface CompanySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
}

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface PaymentMethods {
  cash: boolean;
  card: boolean;
  pix: boolean;
}

interface DeliverySettings {
  fee: number;
  prep_time_minutes: number;
  radius_km: number;
  min_order_value: number;
}

export const CompanySettingsDialog = ({ open, onOpenChange, tenantId }: CompanySettingsDialogProps) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Dados Cadastrais
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  // Personalização
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#f59e0b");
  const [logoUrl, setLogoUrl] = useState("");
  
  // Horários
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    monday: { open: "08:00", close: "22:00", closed: false },
    tuesday: { open: "08:00", close: "22:00", closed: false },
    wednesday: { open: "08:00", close: "22:00", closed: false },
    thursday: { open: "08:00", close: "22:00", closed: false },
    friday: { open: "08:00", close: "22:00", closed: false },
    saturday: { open: "08:00", close: "22:00", closed: false },
    sunday: { open: "08:00", close: "22:00", closed: true },
  });
  
  // Pagamentos
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods>({
    cash: true,
    card: true,
    pix: false,
  });
  const [pixKey, setPixKey] = useState("");
  
  // Entrega
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    fee: 5.0,
    prep_time_minutes: 30,
    radius_km: 10,
    min_order_value: 20.0,
  });

  useEffect(() => {
    if (open && tenantId) {
      fetchTenantData();
    }
  }, [open, tenantId]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();

      if (error) throw error;

      if (data) {
        setCompanyName(data.name || "");
        setCnpj(data.cnpj || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
        setPrimaryColor(data.primary_color || "#3b82f6");
        setSecondaryColor(data.secondary_color || "#f59e0b");
        setLogoUrl(data.logo_url || "");
        setPixKey(data.pix_key || "");
        
        if (data.business_hours) {
          setBusinessHours(data.business_hours as unknown as BusinessHours);
        }
        if (data.payment_methods) {
          setPaymentMethods(data.payment_methods as unknown as PaymentMethods);
        }
        if (data.delivery_settings) {
          setDeliverySettings(data.delivery_settings as unknown as DeliverySettings);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);

      const { error } = await supabase
        .from("tenants")
        .update({
          name: companyName,
          cnpj,
          email,
          phone,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          logo_url: logoUrl,
          business_hours: businessHours as any,
          payment_methods: paymentMethods as any,
          pix_key: pixKey,
          delivery_settings: deliverySettings as any,
        })
        .eq("id", tenantId);

      if (error) throw error;

      toast.success("Configurações salvas com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSubmitting(false);
    }
  };

  const dayNames: { [key: string]: string } = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações da Empresa</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando configurações...</p>
          </div>
        ) : (
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dados">
                <Building2 className="h-4 w-4 mr-2" />
                Dados
              </TabsTrigger>
              <TabsTrigger value="visual">
                <Palette className="h-4 w-4 mr-2" />
                Visual
              </TabsTrigger>
              <TabsTrigger value="horarios">
                <Clock className="h-4 w-4 mr-2" />
                Horários
              </TabsTrigger>
              <TabsTrigger value="pagamento">
                <CreditCard className="h-4 w-4 mr-2" />
                Pagamento
              </TabsTrigger>
              <TabsTrigger value="entrega">
                <Truck className="h-4 w-4 mr-2" />
                Entrega
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="visual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">URL do Logo</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://exemplo.com/logo.png"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-20"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#f59e0b"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="horarios" className="space-y-4 mt-4">
              {Object.entries(businessHours).map(([day, hours]) => (
                <Card key={day}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{dayNames[day]}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`closed-${day}`}>Fechado</Label>
                        <Switch
                          id={`closed-${day}`}
                          checked={hours.closed}
                          onCheckedChange={(checked) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: { ...hours, closed: checked },
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  {!hours.closed && (
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Abertura</Label>
                        <Input
                          type="time"
                          value={hours.open}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: { ...hours, open: e.target.value },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fechamento</Label>
                        <Input
                          type="time"
                          value={hours.close}
                          onChange={(e) =>
                            setBusinessHours({
                              ...businessHours,
                              [day]: { ...hours, close: e.target.value },
                            })
                          }
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="pagamento" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Formas de Pagamento</CardTitle>
                  <CardDescription>Selecione as formas de pagamento aceitas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cash">Dinheiro</Label>
                    <Switch
                      id="cash"
                      checked={paymentMethods.cash}
                      onCheckedChange={(checked) =>
                        setPaymentMethods({ ...paymentMethods, cash: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="card">Cartão</Label>
                    <Switch
                      id="card"
                      checked={paymentMethods.card}
                      onCheckedChange={(checked) =>
                        setPaymentMethods({ ...paymentMethods, card: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pix">PIX</Label>
                    <Switch
                      id="pix"
                      checked={paymentMethods.pix}
                      onCheckedChange={(checked) =>
                        setPaymentMethods({ ...paymentMethods, pix: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
              {paymentMethods.pix && (
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input
                    id="pixKey"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder="email@exemplo.com ou CPF/CNPJ"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="entrega" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="fee">Taxa de Entrega (R$)</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={deliverySettings.fee}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      fee: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prepTime">Tempo de Preparo (minutos)</Label>
                <Input
                  id="prepTime"
                  type="number"
                  value={deliverySettings.prep_time_minutes}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      prep_time_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Raio de Entrega (km)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={deliverySettings.radius_km}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      radius_km: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrder">Pedido Mínimo (R$)</Label>
                <Input
                  id="minOrder"
                  type="number"
                  step="0.01"
                  value={deliverySettings.min_order_value}
                  onChange={(e) =>
                    setDeliverySettings({
                      ...deliverySettings,
                      min_order_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting || loading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};