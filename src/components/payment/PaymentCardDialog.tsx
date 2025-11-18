import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, CheckCircle2, XCircle, Lock } from "lucide-react";
import { toast } from "sonner";

interface PaymentCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
  onPaymentFailed?: () => void;
}

type PaymentState = "idle" | "processing" | "success" | "failed";

export const PaymentCardDialog = ({
  open,
  onOpenChange,
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentFailed,
}: PaymentCardDialogProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState("1");
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [cardBrand, setCardBrand] = useState<string>("");

  // Detectar bandeira do cartão
  const detectCardBrand = (number: string) => {
    const cleaned = number.replace(/\s/g, "");
    if (/^4/.test(cleaned)) return "Visa";
    if (/^5[1-5]/.test(cleaned)) return "Mastercard";
    if (/^3[47]/.test(cleaned)) return "American Express";
    if (/^6(?:011|5)/.test(cleaned)) return "Discover";
    return "";
  };

  // Formatar número do cartão
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    setCardBrand(detectCardBrand(cleaned));
    return formatted.substring(0, 19);
  };

  // Formatar data de validade
  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  // Validar dados do cartão
  const validateCard = () => {
    const cleanedCard = cardNumber.replace(/\s/g, "");
    if (cleanedCard.length < 13 || cleanedCard.length > 19) {
      toast.error("Número do cartão inválido");
      return false;
    }
    if (!cardName.trim()) {
      toast.error("Nome no cartão é obrigatório");
      return false;
    }
    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      toast.error("Data de validade inválida");
      return false;
    }
    if (cvv.length < 3 || cvv.length > 4) {
      toast.error("CVV inválido");
      return false;
    }
    return true;
  };

  // Simular processamento de pagamento
  const processPayment = async () => {
    if (!validateCard()) return;

    setPaymentState("processing");

    try {
      // Simular delay de processamento (2-5 segundos)
      const delay = Math.random() * 3000 + 2000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Simular 95% de sucesso (para testes)
      const success = Math.random() > 0.05;

      if (success) {
        setPaymentState("success");
        
        // Simular dados de autorização
        const authorizationCode = `SIM${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const lastFour = cardNumber.replace(/\s/g, "").slice(-4);

        // Atualizar pedido no banco
        const { supabase } = await import("@/integrations/supabase/client");
        const { error } = await supabase
          .from("orders")
          .update({
            payment_status: "PAID",
            payment_data: {
              method: "CARD",
              card_last_four: lastFour,
              card_brand: cardBrand || "Visa",
              installments: parseInt(installments),
              authorization_code: authorizationCode,
              processed_at: new Date().toISOString(),
            },
          })
          .eq("id", orderId);

        if (error) throw error;

        toast.success("Pagamento aprovado com sucesso!");
        
        setTimeout(() => {
          onPaymentSuccess();
          onOpenChange(false);
          resetForm();
        }, 2000);
      } else {
        setPaymentState("failed");
        toast.error("Pagamento recusado. Verifique os dados do cartão.");
        if (onPaymentFailed) {
          setTimeout(() => {
            onPaymentFailed();
          }, 3000);
        }
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      setPaymentState("failed");
      toast.error("Erro ao processar pagamento. Tente novamente.");
    }
  };

  const resetForm = () => {
    setCardNumber("");
    setCardName("");
    setExpiryDate("");
    setCvv("");
    setInstallments("1");
    setPaymentState("idle");
    setCardBrand("");
  };

  const handleClose = () => {
    if (paymentState === "processing") return;
    onOpenChange(false);
    if (paymentState === "idle") {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Pagamento com Cartão
          </DialogTitle>
          <DialogDescription>
            Valor: <span className="font-bold text-lg">R$ {amount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        {paymentState === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Pagamento Aprovado!</h3>
            <p className="text-muted-foreground text-center">
              Seu pagamento foi processado com sucesso.
            </p>
          </div>
        ) : paymentState === "failed" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <XCircle className="h-16 w-16 text-red-500" />
            <h3 className="text-xl font-semibold">Pagamento Recusado</h3>
            <p className="text-muted-foreground text-center">
              Não foi possível processar o pagamento. Verifique os dados e tente novamente.
            </p>
            <Button onClick={() => setPaymentState("idle")} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número do Cartão</Label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  disabled={paymentState === "processing"}
                  className="pr-10"
                />
                {cardBrand && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {cardBrand}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome no Cartão</Label>
              <Input
                type="text"
                placeholder="NOME COMPLETO"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                disabled={paymentState === "processing"}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Validade</Label>
                <Input
                  type="text"
                  placeholder="MM/AA"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
                  maxLength={5}
                  disabled={paymentState === "processing"}
                />
              </div>

              <div className="space-y-2">
                <Label>CVV</Label>
                <Input
                  type="text"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                  maxLength={4}
                  disabled={paymentState === "processing"}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parcelas</Label>
              <select
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                disabled={paymentState === "processing"}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <option key={num} value={num}>
                    {num}x de R$ {(amount / num).toFixed(2)} sem juros
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Lock className="h-3 w-3" />
              <span>Pagamento seguro e criptografado</span>
            </div>

            <Button
              onClick={processPayment}
              disabled={paymentState === "processing" || !cardNumber || !cardName || !expiryDate || !cvv}
              className="w-full"
              size="lg"
            >
              {paymentState === "processing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando pagamento...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Pagar R$ {amount.toFixed(2)}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

