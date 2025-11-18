import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Copy, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PaymentPixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  orderId: string;
  onPaymentSuccess: () => void;
  onPaymentExpired?: () => void;
}

type PixState = "generating" | "waiting" | "processing" | "success" | "expired";

export const PaymentPixDialog = ({
  open,
  onOpenChange,
  amount,
  orderId,
  onPaymentSuccess,
  onPaymentExpired,
}: PaymentPixDialogProps) => {
  const [pixState, setPixState] = useState<PixState>("generating");
  const [pixCode, setPixCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutos em segundos
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);

  // Gerar código PIX simulado
  const generatePixCode = () => {
    // Simular código PIX (formato EMV)
    const transactionId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const timestamp = Date.now();
    const amountStr = amount.toFixed(2).replace(".", "");
    
    // Código PIX simulado (não é um código real, apenas para demonstração)
    const simulatedPixCode = `00020126580014BR.GOV.BCB.PIX0136${transactionId}520400005303986540${amountStr}5802BR5925DISTRIBUIDORA FACIL LTDA6009SAO PAULO62070503***6304${timestamp.toString().slice(-4)}`;
    
    return {
      code: simulatedPixCode,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(simulatedPixCode)}`,
    };
  };

  // Inicializar PIX quando dialog abrir
  useEffect(() => {
    if (open && pixState === "generating") {
      const { code, qrCodeUrl } = generatePixCode();
      setPixCode(code);
      setQrCodeUrl(qrCodeUrl);
      
      const expiration = new Date();
      expiration.setMinutes(expiration.getMinutes() + 30);
      setExpiresAt(expiration);
      setTimeLeft(30 * 60);
      setPixState("waiting");

      // Salvar dados PIX no pedido
      supabase
        .from("orders")
        .update({
          payment_data: {
            method: "PIX",
            pix_code: code,
            qr_code_url: qrCodeUrl,
            expires_at: expiration.toISOString(),
            generated_at: new Date().toISOString(),
          },
        })
        .eq("id", orderId)
        .then(() => {
          // Iniciar verificação de pagamento
          startPaymentCheck();
        });
    } else if (!open) {
      // Resetar quando fechar
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      resetPix();
    }
  }, [open]);

  // Timer de expiração
  useEffect(() => {
    if (pixState === "waiting" && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setPixState("expired");
            if (onPaymentExpired) {
              onPaymentExpired();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [timeLeft, pixState]);

  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar pagamento (simulado)
  const startPaymentCheck = () => {
    // Limpar intervalo anterior se existir
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Simular verificação de pagamento via WebSocket/SSE
    // Na prática, isso seria uma conexão real com o gateway PIX
    
    // Simular confirmação de pagamento após 10-30 segundos (para demonstração)
    checkIntervalRef.current = setInterval(async () => {
      if (pixState === "waiting") {
        // Simular 30% de chance de pagamento confirmado a cada verificação
        if (Math.random() < 0.3) {
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          await confirmPayment();
        }
      } else {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    }, 5000); // Verificar a cada 5 segundos

    // Timeout de segurança (30 minutos)
    setTimeout(() => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (pixState === "waiting") {
        setPixState("expired");
        if (onPaymentExpired) {
          onPaymentExpired();
        }
      }
    }, 30 * 60 * 1000);
  };

  // Limpar intervalos ao desmontar
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Confirmar pagamento
  const confirmPayment = async () => {
    setPixState("processing");

    try {
      // Simular delay de processamento
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Atualizar pedido no banco
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: "PAID",
          payment_data: {
            method: "PIX",
            pix_code: pixCode,
            qr_code_url: qrCodeUrl,
            confirmed_at: new Date().toISOString(),
            processed_at: new Date().toISOString(),
          },
        })
        .eq("id", orderId);

      if (error) throw error;

      setPixState("success");
      toast.success("Pagamento PIX confirmado!");

      setTimeout(() => {
        onPaymentSuccess();
        onOpenChange(false);
        resetPix();
      }, 2000);
    } catch (error: any) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error("Erro ao confirmar pagamento");
      setPixState("waiting");
    }
  };

  // Copiar código PIX
  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar código");
    }
  };

  // Formatar tempo restante
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const resetPix = () => {
    setPixState("generating");
    setPixCode("");
    setQrCodeUrl("");
    setTimeLeft(30 * 60);
    setCopied(false);
    setExpiresAt(null);
  };

  const handleClose = () => {
    if (pixState === "processing") return;
    onOpenChange(false);
    if (pixState !== "success") {
      resetPix();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Pagamento PIX
          </DialogTitle>
          <DialogDescription>
            Valor: <span className="font-bold text-lg">R$ {amount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>

        {pixState === "generating" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>Gerando código PIX...</p>
          </div>
        ) : pixState === "success" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Pagamento Confirmado!</h3>
            <p className="text-muted-foreground text-center">
              Seu pagamento PIX foi processado com sucesso.
            </p>
          </div>
        ) : pixState === "expired" ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <AlertCircle className="h-16 w-16 text-orange-500" />
            <h3 className="text-xl font-semibold">Código PIX Expirado</h3>
            <p className="text-muted-foreground text-center">
              O código PIX expirou. Gere um novo código para continuar.
            </p>
            <Button onClick={resetPix} variant="outline">
              Gerar Novo Código
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Tempo restante:
                </span>
              </div>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white rounded-lg border-2 border-dashed">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code PIX"
                    className="w-64 h-64"
                  />
                )}
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Escaneie o QR Code com o app do seu banco
              </p>
            </div>

            <div className="space-y-2">
              <Label>Código PIX (Copia e Cola)</Label>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-xs break-all">
                  {pixCode}
                </div>
                <Button
                  onClick={copyPixCode}
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {pixState === "processing" && (
              <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  Verificando pagamento...
                </span>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p className="font-semibold">Instruções:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Abra o app do seu banco</li>
                <li>Escaneie o QR Code ou cole o código PIX</li>
                <li>Confirme o pagamento</li>
                <li>Aguarde a confirmação automática</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

