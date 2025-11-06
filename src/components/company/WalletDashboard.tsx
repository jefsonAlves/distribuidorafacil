import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WalletData {
  balance: number;
  updated_at: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  payment_method: string;
  description: string;
  created_at: string;
}

interface WalletDashboardProps {
  tenantId: string;
}

export function WalletDashboard({ tenantId }: WalletDashboardProps) {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      fetchWalletData();
      fetchTransactions();
      
      // Realtime para transações
      const channel = supabase
        .channel('wallet-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallet_transactions',
            filter: `tenant_id=eq.${tenantId}`
          },
          () => {
            fetchWalletData();
            fetchTransactions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [tenantId]);

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from("company_wallet")
        .select("balance, updated_at")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      setWallet(data);
    } catch (error) {
      console.error("Erro ao carregar carteira:", error);
      toast.error("Erro ao carregar saldo da carteira");
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.created_at);
    return transactionDate.toDateString() === today.toDateString();
  });

  const todayTotal = todayTransactions.reduce((sum, t) => {
    return sum + (t.type === 'credit' ? Number(t.amount) : -Number(t.amount));
  }, 0);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'CASH': 'Dinheiro',
      'CARD': 'Cartão',
      'PIX': 'PIX'
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando carteira...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              R$ {(wallet?.balance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {wallet?.updated_at ? format(new Date(wallet.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Hoje</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              R$ {todayTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayTransactions.length} transaç{todayTransactions.length === 1 ? 'ão' : 'ões'} hoje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Transações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma transação registrada ainda</p>
              <p className="text-sm mt-1">As transações aparecerão quando entregas forem concluídas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-full ${
                      transaction.type === 'credit' ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      <CreditCard className={`h-4 w-4 ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transaction.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {getPaymentMethodLabel(transaction.payment_method)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'credit' ? '+' : '-'}R$ {Number(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
